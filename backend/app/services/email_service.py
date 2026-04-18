"""backend/app/services/email_service.py — Service for sending transactional emails (notifications, alerts) from E·OVR."""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

logger = logging.getLogger(__name__)

SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
# Backward-compatible fallback for older env files that still use EMAIL_FROM.
SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", os.getenv("EMAIL_FROM", ""))


def _sendgrid_enabled() -> bool:
    """Return True when SendGrid is configured with a real API key."""
    if (
        not SENDGRID_API_KEY
        or SENDGRID_API_KEY == "SG.xxxx"
        or len(SENDGRID_API_KEY) < 20
    ):
        logger.warning("SendGrid is not configured (SENDGRID_API_KEY is empty or placeholder); skipping email send.")
        return False
    return True


async def _send_text_email(to_email: str, subject: str, body: str) -> None:
    """Send a plain-text email via SendGrid, never raising to callers."""
    if not _sendgrid_enabled():
        return

    if not SENDGRID_FROM_EMAIL:
        logger.warning("SENDGRID_FROM_EMAIL is empty; skipping email send.")
        return

    message = Mail(
        from_email=SENDGRID_FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body,
    )
    try:
        client = SendGridAPIClient(SENDGRID_API_KEY)
        await asyncio.to_thread(client.send, message)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to send email via SendGrid (to=%s, subject=%s).", to_email, subject)


async def send_submission_alert(to_email: str, incident_id: str, facility: str, severity: str) -> None:
    """Send a plain-text alert email for a newly submitted incident."""
    subject = f"[E·OVR] New incident submitted: {incident_id}"
    body = (
        "A new incident has been submitted in E·OVR.\n\n"
        f"Incident ID: {incident_id}\n"
        f"Facility: {facility}\n"
        f"Severity: {severity}\n\n"
        "Please review and take the next action in the dashboard."
    )
    await _send_text_email(to_email=to_email, subject=subject, body=body)


async def send_status_change_alert(to_email: str, incident_id: str, old_status: str, new_status: str) -> None:
    """Send a plain-text alert email when an incident status changes."""
    subject = f"[E·OVR] Incident status changed: {incident_id}"
    body = (
        "An incident status has been updated in E·OVR.\n\n"
        f"Incident ID: {incident_id}\n"
        f"Old Status: {old_status}\n"
        f"New Status: {new_status}\n\n"
        "Please review the incident timeline in the dashboard."
    )
    await _send_text_email(to_email=to_email, subject=subject, body=body)
