"""backend/app/routers/health.py — Public health endpoint for runtime checks."""

from __future__ import annotations

import logging
from fastapi import APIRouter

from app.db.database import get_database
from app.startup_checks import get_ai_provider, sendgrid_configured

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


def _sendgrid_status() -> str:
    return "configured" if sendgrid_configured() else "not_configured"


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
        "ai_provider": get_ai_provider(),
        "sendgrid": _sendgrid_status(),
        "version": "1.0.0",
    }
