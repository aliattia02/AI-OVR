"""backend/app/routers/exports.py — API routes for exporting incident data to CSV, PDF, or other formats in E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import os
from pathlib import Path
from threading import Lock
from typing import Any

import arabic_reshaper
from bidi.algorithm import get_display
from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.db.database import get_database
from app.services import auth_service
from app.utils.helpers import get_scope_filter

router = APIRouter(prefix="/exports", tags=["exports"])

_FONT_REGISTERED = False
_FONT_NAME = "Helvetica"
_FONT_LOCK = Lock()


def _rtl_text(value: Any) -> str:
    text = "" if value is None else str(value)
    return get_display(arabic_reshaper.reshape(text))


def _ensure_font() -> str:
    global _FONT_REGISTERED, _FONT_NAME  # noqa: PLW0603
    with _FONT_LOCK:
        if _FONT_REGISTERED:
            return _FONT_NAME

        candidates: list[Path] = []
        configured_font = os.getenv("PDF_ARABIC_FONT_PATH", "").strip()
        if configured_font:
            candidates.append(Path(configured_font))
        candidates.extend(
            [
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                Path("/usr/share/fonts/dejavu/DejaVuSans.ttf"),
                Path("/Library/Fonts/Arial Unicode.ttf"),
                Path("C:/Windows/Fonts/arial.ttf"),
            ]
        )
        for font_path in candidates:
            if font_path.exists():
                pdfmetrics.registerFont(TTFont("DejaVuSans", str(font_path)))
                _FONT_NAME = "DejaVuSans"
                break
        _FONT_REGISTERED = True
    return _FONT_NAME


@router.get("/excel")
async def export_excel(
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    scope = get_scope_filter(claims["role"], claims)
    cursor = db["incidents"].find(scope, {"_id": 0}).sort("registration_date", -1)
    rows = await cursor.to_list(length=None)

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Incidents"

    columns = [
        "incident_id",
        "registration_date",
        "status",
        "severity",
        "event_type",
        "facility_name",
        "governorate",
        "description",
    ]
    sheet.append(columns)
    for row in rows:
        sheet.append([row.get(column) for column in columns])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"EOVR_Export_{datetime.now(tz=timezone.utc).date().isoformat()}.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/pdf/{id}")
async def export_incident_pdf(
    incident_id: str = Path(alias="id"),
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    scope = get_scope_filter(claims["role"], claims)
    incident = await db["incidents"].find_one({"incident_id": incident_id, **scope}, {"_id": 0})
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    font_name = _ensure_font()
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    y = height - 40
    pdf.setFont(font_name, 14)
    pdf.drawRightString(width - 40, y, _rtl_text(f"تقرير حادثة: {incident.get('incident_id', incident_id)}"))
    y -= 28

    pdf.setFont(font_name, 11)
    fields = [
        ("المنشأة", incident.get("facility_name", "")),
        ("المحافظة", incident.get("governorate", "")),
        ("التصنيف", incident.get("error_classification", "")),
        ("نوع الحدث", incident.get("event_type", "")),
        ("الشدة", incident.get("severity", "")),
        ("الحالة", incident.get("status", "")),
    ]
    for label, value in fields:
        pdf.drawRightString(width - 40, y, _rtl_text(f"{label}: {value}"))
        y -= 20

    description = _rtl_text(f"الوصف: {incident.get('description', '')}")
    pdf.drawRightString(width - 40, y, description)
    y -= 24
    occurrence = _rtl_text(
        f"وقت/تاريخ الوقوع: {incident.get('occurrence_date', '')} {incident.get('occurrence_time', '')}"
    )
    pdf.drawRightString(width - 40, y, occurrence)

    pdf.showPage()
    pdf.save()
    output.seek(0)

    headers = {"Content-Disposition": f'attachment; filename="EOVR_Incident_{incident_id}.pdf"'}
    return StreamingResponse(output, media_type="application/pdf", headers=headers)
