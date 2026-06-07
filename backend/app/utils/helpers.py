"""backend/app/utils/helpers.py — General-purpose utility functions (date formatting, ID generation, sanitization) for E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone

from app.utils.enums import Probability, Severity, UserRole

# ── Risk matrix ───────────────────────────────────────────────────────────────
# GAHAR SAC 4×4 matrix — scores 1–3 (matches frontend RiskMatrix.jsx)
# Rows = Severity (Catastrophic → Minor)
# Cols = Probability (Frequent → Remote)
# SAC 3 = Critical  |  SAC 2 = Intermediate  |  SAC 1 = Low
_RISK_MATRIX: dict[Severity, dict[Probability, int]] = {
    Severity.Catastrophic: {Probability.Frequent: 3, Probability.Occasional: 3, Probability.Uncommon: 3, Probability.Remote: 3},
    Severity.Major:        {Probability.Frequent: 3, Probability.Occasional: 2, Probability.Uncommon: 2, Probability.Remote: 2},
    Severity.Moderate:     {Probability.Frequent: 2, Probability.Occasional: 1, Probability.Uncommon: 1, Probability.Remote: 1},
    Severity.Minor:        {Probability.Frequent: 1, Probability.Occasional: 1, Probability.Uncommon: 1, Probability.Remote: 1},
}


def generate_incident_id(count: int) -> str:
    """Return a zero-padded incident identifier for the current calendar year.

    Args:
        count: Sequential number of the incident (1-based).

    Returns:
        A string of the form ``"OVR-{year}-{count:03d}"``, e.g. ``"OVR-2026-001"``.
    """
    year = datetime.now(tz=timezone.utc).year
    return f"OVR-{year}-{count:03d}"


def compute_risk_score(severity: Severity, probability: Probability) -> int:
    """Look up the SAC risk score for a given severity/probability combination.

    Uses the GAHAR SAC 4×4 matrix (scores 1–3, matching frontend RiskMatrix.jsx)::

        Catastrophic / Frequent=3, Occasional=3, Uncommon=3, Remote=3
        Major        / Frequent=3, Occasional=2, Uncommon=2, Remote=2
        Moderate     / Frequent=2, Occasional=1, Uncommon=1, Remote=1
        Minor        / Frequent=1, Occasional=1, Uncommon=1, Remote=1

    SAC 3 = Critical  |  SAC 2 = Intermediate  |  SAC 1 = Low

    Args:
        severity:    Clinical severity of the incident (GAHAR 4-level scale).
        probability: Likelihood of recurrence (GAHAR 4-level scale).

    Returns:
        Integer SAC risk score in the range 1–3.
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
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "user_id": user_id,
        "action": action,
        "old_status": old_status,
        "new_status": new_status,
    }