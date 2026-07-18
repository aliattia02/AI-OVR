"""backend/app/routers/exports.py — API routes for exporting incident data to CSV, PDF, or other formats in E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import os
from pathlib import Path
from threading import Lock
from typing import Any, Callable, Optional

import arabic_reshaper
from bidi.algorithm import get_display
from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.db.database import get_database
from app.services import auth_service
from app.utils.enums import FACILITY_TYPE_EN
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


def _get_path(doc: dict[str, Any], path: str) -> Any:
    """Resolve a dotted path (e.g. ``"ai_metadata.auto_classification"``) against a raw Mongo dict.

    Returns ``None`` if any segment along the path is missing or not a dict,
    rather than raising — export rows are heterogeneous (legacy documents may
    be missing newer sub-fields entirely).
    """
    node: Any = doc
    for part in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node


def _join_list(value: Any) -> Any:
    """Flatten a list field (e.g. signal_flags) into a single readable cell value."""
    if isinstance(value, (list, tuple)):
        return "; ".join(str(v) for v in value if v not in (None, ""))
    return value


def _count_list(value: Any) -> Any:
    return len(value) if isinstance(value, list) else 0


def _yes_no(value: Any) -> Any:
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return value


def _facility_type_label(value: Any) -> Any:
    return FACILITY_TYPE_EN.get(value, value)


# ── Excel export column definition ────────────────────────────────────────────
# Each entry is (header, dotted-path-into-the-raw-document, optional formatter).
# This intentionally covers nearly every field on the incident document —
# the two exceptions are ai_metadata.embedding_vector (a 1536-float vector with
# no value in a spreadsheet) and ai_metadata.embedding_id (internal use only).
EXCEL_EXPORT_COLUMNS: list[tuple[str, str, Optional[Callable[[Any], Any]]]] = [
    ("Incident ID", "incident_id", None),
    ("Status", "status", None),
    ("Severity", "severity", None),
    ("Probability", "probability", None),
    ("Risk Score (SAC)", "risk_score", None),
    ("Error Classification", "error_classification", None),
    ("Specific Error", "specific_error", None),
    ("Event Type", "event_type", None),
    ("Event Discovery Method", "event_discovery_method", None),
    ("Facility Name", "facility_name", None),
    ("Facility Type", "facility_type", _facility_type_label),
    ("Governorate", "governorate", None),
    ("Administration", "administration", None),
    ("Occurrence Date", "occurrence_date", None),
    ("Occurrence Time", "occurrence_time", None),
    ("Occurrence Location", "occurrence_location", None),
    ("Registration Date", "registration_date", None),
    ("Report Date", "report_date", None),
    ("Report Time", "report_time", None),
    ("Reporter Type", "reporter_type", None),
    ("Reporter Role", "reporter_role", None),
    ("Reporter User ID", "reporter_user_id", None),
    ("Involved Person", "involved_person", None),
    ("Reporting Department", "reporting_department", None),
    ("Responsible Manager", "responsible_manager", None),
    ("Description", "description", None),
    ("Recommendations", "recommendations", None),
    ("Notes", "notes", None),
    ("Medical File Number", "medical_file_number", None),
    ("Medication Error Stage", "medication_stage_of_error", None),
    ("Medication MERP Category (intake)", "medication_merp_category", None),
    ("Medication MERP Category (disclosure)", "medication_error_merp_category", None),
    ("Disclosure Date", "disclosure_date", None),
    ("Disclosure Method", "disclosure_method", None),
    ("Disclosure Responsible", "disclosure_responsible", None),
    ("Vulnerable Patient", "vulnerable_patient", _yes_no),
    ("Vulnerable Population Type", "vulnerable_population_type", None),
    ("Workplace Violence", "workplace_violence", _yes_no),
    ("Corrective Action", "corrective_action", None),
    ("Preventive Action", "preventive_action", None),
    ("Action Date", "action_date", None),
    ("Action Time", "action_time", None),
    ("Action Status", "action_status", None),
    ("Final Report", "final_report", None),
    ("GAHAR Section", "gahar_section", None),
    ("GAHAR GSR Code", "gahar_gsr_code", None),
    ("GAHAR Standard Code", "gahar_standard_code", None),
    ("GAHAR Compliance Status", "gahar_compliance_status", None),
    ("GAHAR Evidence", "gahar_evidence", None),
    ("GAHAR Gap Analysis", "gahar_gap_analysis", None),
    ("GAHAR Action Plan", "gahar_action_plan", None),
    ("AI Suggested Classification", "ai_metadata.auto_classification", None),
    ("AI Suggested Event Type", "ai_metadata.auto_event_type", None),
    ("AI Classification Confidence", "ai_metadata.classification_score", None),
    ("AI Risk Score", "ai_metadata.ai_risk_score", None),
    ("AI Signal Flags", "ai_metadata.signal_flags", _join_list),
    ("Similar Incident IDs", "ai_metadata.similar_incident_ids", _join_list),
    ("AI Model Version", "ai_metadata.model_version", None),
    ("AI Processed At", "ai_metadata.processed_at", None),
    ("AI Human Reviewed", "ai_metadata.human_reviewed", _yes_no),
    ("AI Feedback: Human Chose", "ai_metadata.feedback.human_chose", None),
    ("AI Feedback: Reviewer ID", "ai_metadata.feedback.reviewer_id", None),
    ("AI Feedback: Reviewed At", "ai_metadata.feedback.reviewed_at", None),
    ("Attachments Count", "attachments", _count_list),
    ("Audit Trail Entries", "audit_trail", _count_list),
]

# Columns that hold long free-text — given extra width so the sheet is readable.
_WIDE_COLUMN_HEADERS = {
    "Description", "Recommendations", "Notes", "Corrective Action",
    "Preventive Action", "Final Report", "GAHAR Evidence",
    "GAHAR Gap Analysis", "GAHAR Action Plan", "AI Signal Flags",
    "Similar Incident IDs",
}


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

    headers = [header for header, _, _ in EXCEL_EXPORT_COLUMNS]
    sheet.append(headers)

    for row in rows:
        values = []
        for _header, path, formatter in EXCEL_EXPORT_COLUMNS:
            value = _get_path(row, path)
            if formatter is not None:
                value = formatter(value)
            values.append(value)
        sheet.append(values)

    # Freeze the header row and widen columns so the sheet is usable without
    # manual reformatting — long free-text fields get extra room.
    sheet.freeze_panes = "A2"
    for col_idx, header in enumerate(headers, start=1):
        column_letter = get_column_letter(col_idx)
        sheet.column_dimensions[column_letter].width = 42 if header in _WIDE_COLUMN_HEADERS else 18

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"EOVR_Export_{datetime.now(tz=timezone.utc).date().isoformat()}.xlsx"
    headers_out = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_out,
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