"""backend/app/utils/helpers.py — General-purpose utility functions (date formatting, ID generation, sanitization) for E·OVR."""

from __future__ import annotations

from datetime import datetime

from app.utils.enums import Probability, Severity, UserRole

# ── Risk matrix ───────────────────────────────────────────────────────────────
# Rows = Severity (Major, Moderate, Minor)
# Cols = Probability (High, Medium, Low)
_RISK_MATRIX: dict[Severity, dict[Probability, int]] = {
    Severity.Major:    {Probability.High: 9, Probability.Medium: 6, Probability.Low: 3},
    Severity.Moderate: {Probability.High: 6, Probability.Medium: 4, Probability.Low: 2},
    Severity.Minor:    {Probability.High: 3, Probability.Medium: 2, Probability.Low: 1},
}


def generate_incident_id(count: int) -> str:
    """Return a zero-padded incident identifier for the current calendar year.

    Args:
        count: Sequential number of the incident (1-based).

    Returns:
        A string of the form ``"OVR-{year}-{count:03d}"``, e.g. ``"OVR-2026-001"``.
    """
    year = datetime.utcnow().year
    return f"OVR-{year}-{count:03d}"


def compute_risk_score(severity: Severity, probability: Probability) -> int:
    """Look up the risk score for a given severity/probability combination.

    Uses a 3×3 matrix::

        Major/High=9,    Major/Medium=6,    Major/Low=3
        Moderate/High=6, Moderate/Medium=4, Moderate/Low=2
        Minor/High=3,    Minor/Medium=2,    Minor/Low=1

    Args:
        severity:    Clinical severity of the incident.
        probability: Likelihood of recurrence.

    Returns:
        Integer risk score in the range 1–9.
    """
    return _RISK_MATRIX[Severity(severity)][Probability(probability)]


def get_scope_filter(role: UserRole, claims: dict) -> dict:
    """Build a MongoDB filter dict that restricts queries to the caller's access tier.

    Args:
        role:   The ``UserRole`` of the authenticated user.
        claims: JWT payload / token claims dictionary.

    Returns:
        A MongoDB-compatible filter dict (may be empty for top-level access).

    Raises:
        ValueError: If *role* is not a recognised ``UserRole``.
    """
    role = UserRole(role)

    if role == UserRole.staff:
        return {"reporter_user_id": claims["user_id"]}
    if role == UserRole.quality_admin:
        return {"facility_name": claims["facility"]}
    if role == UserRole.administration_manager:
        return {"administration": claims["administration"]}
    if role == UserRole.governorate_manager:
        return {"governorate": claims["governorate"]}
    if role == UserRole.top_management:
        return {}

    # patient role has no incident scope in the administrative sense
    return {"reporter_user_id": claims["user_id"]}


def build_audit_entry(
    user_id: str,
    action: str,
    old_status: str | None = None,
    new_status: str | None = None,
) -> dict:
    """Create a timestamped audit-trail entry dictionary.

    Args:
        user_id:    Identifier of the user performing the action.
        action:     Human-readable description of the action (e.g. ``"status_change"``).
        old_status: Previous status value, if applicable.
        new_status: Updated status value, if applicable.

    Returns:
        A plain ``dict`` suitable for embedding in an ``audit_trail`` array::

            {
                "timestamp": "2026-04-18T10:00:00.000000+00:00",
                "user_id":   "abc123",
                "action":    "status_change",
                "old_status": "Created",
                "new_status": "InProgress",
        }
    """
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "action": action,
        "old_status": old_status,
        "new_status": new_status,
    }
