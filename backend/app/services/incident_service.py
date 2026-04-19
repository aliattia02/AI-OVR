"""backend/app/services/incident_service.py — Business logic for incident CRUD operations, status transitions, and workflow in E·OVR."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.ai_metadata import AIMetadata
from app.models.incident import IncidentCreate, IncidentInDB, IncidentResponse
from app.services import ai_service
from app.utils.enums import ActionStatus, IncidentStatus, Probability, ReporterType, Severity
from app.utils.helpers import (
    build_audit_entry,
    compute_risk_score,
    generate_incident_id,
    get_scope_filter,
)

# ── Status transition table ───────────────────────────────────────────────────
# Defines the only legal one-step status transitions.
# Created → InProgress → Evaluating → ActionTaken → Completed
# Evaluating ↔ MoreInfoNeeded  (re-open loop)
_ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.Created:        {IncidentStatus.InProgress},
    IncidentStatus.InProgress:     {IncidentStatus.Evaluating},
    IncidentStatus.Evaluating:     {IncidentStatus.ActionTaken, IncidentStatus.MoreInfoNeeded},
    IncidentStatus.MoreInfoNeeded: {IncidentStatus.Evaluating},
    IncidentStatus.ActionTaken:    {IncidentStatus.Completed},
    IncidentStatus.Completed:      set(),
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _doc_to_incident(doc: dict) -> IncidentInDB:
    """Convert a raw MongoDB document to an :class:`IncidentInDB` instance.

    Coerces the ``_id`` ObjectId (or any non-string value) to a plain string so
    that Pydantic can populate the aliased ``id`` field correctly.
    """
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return IncidentInDB(**doc)


# ── Service functions ─────────────────────────────────────────────────────────

async def create_incident(
    data: IncidentCreate,
    reporter_type: ReporterType,
    user_id: str | None,
    db: AsyncIOMotorDatabase,
) -> IncidentInDB:
    """Create a new incident document, fire the AI classification hook, and persist it.

    Steps:
    1. Look up the facility to denormalise ``governorate`` and ``administration``.
    2. Stamp ``registration_date`` with the current UTC time.
    3. Generate a human-readable ``incident_id`` (e.g. ``"OVR-2026-001"``).
    4. Attach an :meth:`AIMetadata.empty` subdocument.
    5. Build the initial ``audit_trail`` entry.
    6. Call :func:`~app.services.ai_service.classify_incident`.  If a result is
       returned, merge its fields into ``ai_metadata`` *before* the document is
       written to MongoDB.
    7. Insert the document and return the fully-populated :class:`IncidentInDB`.

    Args:
        data:          Validated submission payload from the reporter form.
        reporter_type: Whether the reporter is a patient or staff member.
        user_id:       Authenticated user ID, or ``None`` for anonymous patients.
        db:            Async Motor database instance.

    Returns:
        The newly created :class:`IncidentInDB` with its assigned ``_id``.
    """
    # ✅ Fixed — reject if facility not found; never trust form-supplied governorate
    from fastapi import HTTPException, status

    facility_doc = await db["facilities"].find_one({"facility_name": data.facility_name})
    if facility_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility '{data.facility_name}' not found. "
                   "Submit a valid facility name from the approved list.",
        )
    administration: str = facility_doc.get("administration", "")
    governorate: str = facility_doc.get("governorate", "")

    # Steps 2–3
    registration_date = datetime.now(tz=timezone.utc)
    count = await db["incidents"].count_documents({}) + 1
    incident_id = generate_incident_id(count)

    # Steps 4–5
    ai_metadata = AIMetadata.empty()
    audit_entry = build_audit_entry(user_id=user_id or "", action="Created")

    incident = IncidentInDB(
        **data.model_dump(),
        incident_id=incident_id,
        reporter_type=reporter_type,
        reporter_user_id=user_id,
        administration=administration,
        governorate=governorate,
        registration_date=registration_date,
        ai_metadata=ai_metadata,
        audit_trail=[audit_entry],
    )

    # Step 6 — On-submit AI classification hook (dormant when AI_PROVIDER=none)
    facility_context = f"{data.facility_name} ({data.facility_type.value}), {governorate}"
    ai_result = await ai_service.classify_incident(data.description, facility_context)
    if ai_result is not None:
        incident.ai_metadata.auto_classification = ai_result.auto_classification
        incident.ai_metadata.auto_event_type = ai_result.auto_event_type
        incident.ai_metadata.classification_score = ai_result.classification_score
        incident.ai_metadata.ai_risk_score = ai_result.ai_risk_score
        incident.ai_metadata.signal_flags = ai_result.signal_flags or []
        incident.ai_metadata.model_version = ai_result.model_version
        incident.ai_metadata.processed_at = ai_result.processed_at

    # Step 7 — Persist; use mode="json" so date/enum values are JSON-serialisable
    doc = incident.model_dump(by_alias=True, mode="json")
    doc.pop("_id", None)  # let MongoDB auto-assign the _id
    result = await db["incidents"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return IncidentInDB(**doc)


async def get_incidents(
    role: str,
    claims: dict,
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 50,
) -> List[IncidentResponse]:
    """Return a role-scoped, paginated list of incidents sorted by recency.

    Args:
        role:   The caller's :class:`~app.utils.enums.UserRole` string value.
        claims: JWT payload / token claims dictionary.
        db:     Async Motor database instance.
        skip:   Number of documents to skip (for pagination).
        limit:  Maximum number of documents to return.

    Returns:
        A list of :class:`IncidentResponse` objects, newest first.
    """
    scope_filter = get_scope_filter(role, claims)
    cursor = (
        db["incidents"]
        .find(scope_filter)
        .sort("registration_date", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    incidents: List[IncidentResponse] = []
    for doc in docs:
        doc = dict(doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        incidents.append(IncidentResponse(**doc))
    return incidents


async def get_incident_by_id(
    incident_id: str,
    role: str,
    claims: dict,
    db: AsyncIOMotorDatabase,
) -> IncidentInDB | None:
    """Return a single incident by its human-readable ``incident_id``, scoped to role.

    Args:
        incident_id: The human-readable reference code (e.g. ``"OVR-2026-001"``).
        role:        The caller's :class:`~app.utils.enums.UserRole` string value.
        claims:      JWT payload / token claims dictionary.
        db:          Async Motor database instance.

    Returns:
        The :class:`IncidentInDB` if found and in scope, otherwise ``None``.
    """
    scope_filter = get_scope_filter(role, claims)
    query = {"incident_id": incident_id, **scope_filter}
    doc = await db["incidents"].find_one(query)
    if doc is None:
        return None
    return _doc_to_incident(doc)


async def update_status(
    incident_id: str,
    new_status: IncidentStatus,
    user_id: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Transition an incident's status, enforcing the allowed transition table.

    Legal transitions::

        Created → InProgress → Evaluating → ActionTaken → Completed
                                Evaluating ↔ MoreInfoNeeded

    Args:
        incident_id: Human-readable reference code.
        new_status:  The desired target :class:`~app.utils.enums.IncidentStatus`.
        user_id:     ID of the user performing the transition.
        db:          Async Motor database instance.

    Returns:
        ``True`` if the document was updated; ``False`` if not found or the
        transition is illegal.
    """
    doc = await db["incidents"].find_one({"incident_id": incident_id}, {"status": 1})
    if doc is None:
        return False

    current_status = IncidentStatus(doc["status"])
    if new_status not in _ALLOWED_TRANSITIONS.get(current_status, set()):
        return False

    audit_entry = build_audit_entry(
        user_id=user_id,
        action="status_change",
        old_status=current_status.value,
        new_status=new_status.value,
    )
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": {"status": new_status.value},
            "$push": {"audit_trail": audit_entry},
        },
    )
    return result.modified_count > 0


async def save_assessment(
    incident_id: str,
    severity: Severity,
    probability: Probability,
    user_id: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Store the risk assessment and compute the composite risk score.

    Args:
        incident_id: Human-readable reference code.
        severity:    Clinical severity of the incident.
        probability: Likelihood of recurrence.
        user_id:     ID of the user saving the assessment.
        db:          Async Motor database instance.

    Returns:
        ``True`` if the document was updated; ``False`` if not found.
    """
    risk_score = compute_risk_score(severity, probability)
    audit_entry = build_audit_entry(user_id=user_id, action="assessment_saved")
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "severity": Severity(severity).value,
                "probability": Probability(probability).value,
                "risk_score": risk_score,
            },
            "$push": {"audit_trail": audit_entry},
        },
    )
    return result.modified_count > 0


async def save_actions(
    incident_id: str,
    corrective: Optional[str],
    preventive: Optional[str],
    action_date: Optional[date],
    action_time: Optional[str],
    action_status: ActionStatus,
    user_id: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Store corrective and preventive action details for an incident.

    Args:
        incident_id:   Human-readable reference code.
        corrective:    Description of the corrective action taken.
        preventive:    Description of the preventive action planned.
        action_date:   Date the action was or will be completed.
        action_time:   Time (HH:MM) the action was or will be completed.
        action_status: Current completion state of the action.
        user_id:       ID of the user saving the actions.
        db:            Async Motor database instance.

    Returns:
        ``True`` if the document was updated; ``False`` if not found.
    """
    audit_entry = build_audit_entry(user_id=user_id, action="actions_saved")
    # pymongo does not support Python datetime.date objects natively; convert to
    # an ISO-format string so that Pydantic can coerce it back to `date` on read.
    set_fields: dict = {
        "corrective_action": corrective,
        "preventive_action": preventive,
        "action_date": action_date.isoformat() if action_date is not None else None,
        "action_time": action_time,
        "action_status": ActionStatus(action_status).value,
    }
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": set_fields,
            "$push": {"audit_trail": audit_entry},
        },
    )
    return result.modified_count > 0


async def save_final_report(
    incident_id: str,
    report_text: str,
    user_id: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Persist the final report text and advance the incident to *Completed*.

    Sets ``report_date`` and ``report_time`` from the current UTC timestamp.

    Args:
        incident_id: Human-readable reference code.
        report_text: Free-text body of the final report.
        user_id:     ID of the user submitting the report.
        db:          Async Motor database instance.

    Returns:
        ``True`` if the document was updated; ``False`` if not found.
    """
    now = datetime.now(tz=timezone.utc)
    audit_entry = build_audit_entry(
        user_id=user_id,
        action="status_change",
        old_status=None,
        new_status=IncidentStatus.Completed.value,
    )
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "final_report": report_text,
                "report_date": now.date().isoformat(),
                "report_time": now.strftime("%H:%M"),
                "status": IncidentStatus.Completed.value,
            },
            "$push": {"audit_trail": audit_entry},
        },
    )
    return result.modified_count > 0


async def save_ai_feedback(
    incident_id: str,
    ai_suggested: Optional[str],
    human_chose: Optional[str],
    reviewer_id: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Record a Quality Admin's feedback on the AI classification suggestion.

    Writes the :class:`~app.models.ai_metadata.AIFeedback` sub-fields directly
    via dot-notation ``$set`` and marks ``human_reviewed = true``.

    Args:
        incident_id:  Human-readable reference code.
        ai_suggested: The classification the model originally suggested.
        human_chose:  The classification the reviewer decided to use instead.
        reviewer_id:  User ID of the Quality Admin reviewer.
        db:           Async Motor database instance.

    Returns:
        ``True`` if the document was updated; ``False`` if not found.
    """
    now = datetime.now(tz=timezone.utc)
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "ai_metadata.feedback.ai_suggested": ai_suggested,
                "ai_metadata.feedback.human_chose": human_chose,
                "ai_metadata.feedback.reviewer_id": reviewer_id,
                # Store as ISO string for consistency with create_incident (mode="json")
                "ai_metadata.feedback.reviewed_at": now.isoformat(),
                "ai_metadata.human_reviewed": True,
            },
        },
    )
    return result.modified_count > 0
