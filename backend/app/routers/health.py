"""backend/app/routers/health.py — Public health endpoint for runtime checks."""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter

from app.db.database import get_database

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


def _sendgrid_status() -> str:
    key = os.getenv("SENDGRID_API_KEY", "")
    if key and key != "SG.xxxx" and len(key) >= 20:
        return "configured"
    return "not_configured"


def _ai_provider() -> str:
    provider = (os.getenv("AI_PROVIDER") or "").strip()
    return provider or "none"


@router.get("/health")
async def health_check() -> dict[str, str]:
    db_status = "unreachable"
    try:
        db = get_database()
        await db.command("ping")
        db_status = "connected"
    except Exception:  # noqa: BLE001
        logger.exception("Health check failed to reach MongoDB.")

    return {
        "status": "ok",
        "db": db_status,
        "ai_provider": _ai_provider(),
        "sendgrid": _sendgrid_status(),
        "version": "1.0.0",
    }
