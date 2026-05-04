"""backend/app/startup_checks.py — Validate required environment variables at startup."""

from __future__ import annotations

import base64
import binascii
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def _is_truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _sendgrid_configured() -> bool:
    key = os.getenv("SENDGRID_API_KEY", "")
    return bool(key and key != "SG.xxxx" and len(key) >= 20)


def _ai_provider() -> str:
    provider = (os.getenv("AI_PROVIDER") or "").strip()
    return provider or "none"


def _log_startup_summary() -> None:
    csfle_enabled = _is_truthy(os.getenv("CSFLE_ENABLED"))
    sendgrid_status = "configured" if _sendgrid_configured() else "not_configured"
    ai_provider = _ai_provider()
    logger.info(
        "Startup integrations: CSFLE=%s, SendGrid=%s, AI=%s",
        "enabled" if csfle_enabled else "disabled",
        sendgrid_status,
        ai_provider,
    )


def validate_required_env_vars() -> None:
    missing: list[str] = []

    if not os.getenv("MONGO_URL"):
        missing.append("MONGO_URL")

    if not (os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME")):
        missing.append("DB_NAME")

    if not (os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY")):
        missing.append("JWT_SECRET")

    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    if _is_truthy(os.getenv("CSFLE_ENABLED")):
        master_key_b64 = os.getenv("CSFLE_LOCAL_MASTER_KEY", "").strip()
        if not master_key_b64:
            raise RuntimeError("CSFLE_LOCAL_MASTER_KEY is required when CSFLE_ENABLED is true.")
        try:
            master_key = base64.b64decode(master_key_b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise RuntimeError("CSFLE_LOCAL_MASTER_KEY must be valid base64.") from exc
        if len(master_key) != 96:
            raise RuntimeError("CSFLE_LOCAL_MASTER_KEY must decode to exactly 96 bytes.")

    ai_provider = _ai_provider().lower()
    if ai_provider not in {"none", ""} and not os.getenv("AI_API_KEY"):
        logger.warning("AI_PROVIDER is set but AI_API_KEY is missing; AI features may be disabled.")

    _log_startup_summary()
