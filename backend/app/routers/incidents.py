"""backend/app/routers/incidents.py — API routes for incident creation, retrieval, and workflow management in E·OVR."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.incident import (
    DisclosureMethod,
    IncidentCreate,
    IncidentResponse,
    JCIChapter,
    JCIComplianceStatus,
    VulnerablePopulationType,
)
from app.services import email_service, facility_service, incident_service
from app.utils.enums import ActionStatus, IncidentStatus, Probability, Severity, UserRole
from app.utils.helpers import build_audit_entry

router = APIRouter(prefix="/incidents", tags=["incidents"])


# ── List incidents ────────────────────────────────────────────────────────────

@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    skip: int = 0,
    limit: int = 50,
    response: Response,
    claims: dict = Depends(
        require_role(
            UserRole.staff,
            UserRole.quality_admin,
            UserRole.administration_manager,
            UserRole.governorate_manager,
            UserRole.top_management,
        )
    ),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[IncidentResponse]:
    """Return incidents scoped automatically to the caller's access tier.

    Cache-Control is set to no-store so that Vercel's edge cache and the
    browser never serve a stale (possibly empty) response for this endpoint.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return await incident_service.get_incidents(
        role=claims["role"],
        claims=claims,
        db=db,
        skip=skip,
        limit=limit,
    )


# ── Create incident ───────────────────────────────────────────────────────────

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    data: IncidentCreate,
    claims: dict = Depends(require_role(UserRole.staff, UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> IncidentResponse:
    """Create a new incident.

    Note: the on-submit AI classification hook is inside
    incident_service.create_incident() — not in this router.
    It fires before the MongoDB insert and writes into ai_metadata if a model
    is configured. If AI_PROVIDER=none, ai_metadata fields remain null silently.
    """
    from app.utils.enums import ReporterType

    incident = await incident_service.create_incident(
        data=data,
        reporter_type=ReporterType.staff,
        user_id=claims.get("user_id"),
        db=db,
    )

    # Notify Quality Admin by email — fails silently if SendGrid key is missing.
    qa_email = await facility_service.get_quality_admin_email(incident.facility_name, db)
    if qa_email:
        await email_service.send_submission_alert(
            to_email=qa_email,
            incident_id=incident.incident_id,
            facility=incident.facility_name,
            severity=incident.severity.value,
        )

    return incident


# ── Get single incident ───────────────────────────────────────────────────────

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    response: Response,
    claims: dict = Depends(
        require_role(
            UserRole.staff,
            UserRole.quality_admin,
            UserRole.administration_manager,
            UserRole.governorate_manager,
            UserRole.top_management,
        )
    ),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> IncidentResponse:
    """Return a single incident scoped to the caller's access tier."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return incident


# ── Status update ─────────────────────────────────────────────────────────────

class StatusUpdateBody(BaseModel):
    new_status: IncidentStatus


@router.patch("/{incident_id}/status", response_model=dict)
async def update_status(
    incident_id: str,
    body: StatusUpdateBody,
    claims: dict = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Advance the incident workflow status. Only legal transitions are accepted."""
    # Capture the current status BEFORE the transition so the email can report
    # the real "from" state.  Uses a lightweight projection — no full document read.
    pre_doc = await db["incidents"].find_one(
        {"incident_id": incident_id}, {"status": 1}
    )
    old_status_value: str = pre_doc["status"] if pre_doc else ""

    updated = await incident_service.update_status(
        incident_id=incident_id,
        new_status=body.new_status,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status transition or incident not found.",
        )

    # Email notification for status changes — old_status now carries the real
    # pre-transition value instead of the previous hardcoded empty string.
    incident = await incident_service.get_incident_by_id(incident_id, claims["role"], claims, db)
    if incident:
        qa_email = await facility_service.get_quality_admin_email(incident.facility_name, db)
        if qa_email:
            await email_service.send_status_change_alert(
                to_email=qa_email,
                incident_id=incident_id,
                old_status=old_status_value,
                new_status=body.new_status.value,
            )

    return {"updated": True, "new_status": body.new_status.value}


# ── Risk assessment ───────────────────────────────────────────────────────────

class AssessmentBody(BaseModel):
    severity: Severity
    probability: Probability


@router.patch("/{incident_id}/assessment", response_model=dict)
async def save_assessment(
    incident_id: str,
    body: AssessmentBody,
    claims: dict = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Set severity and probability; risk_score is computed server-side."""
    updated = await incident_service.save_assessment(
        incident_id=incident_id,
        severity=body.severity,
        probability=body.probability,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return {"updated": True}


# ── CAPA actions ──────────────────────────────────────────────────────────────

class ActionsBody(BaseModel):
    corrective_action: str
    preventive_action: str
    action_date: date | None = None
    action_time: str | None = None
    action_status: ActionStatus = ActionStatus.InProgress


@router.patch("/{incident_id}/actions", response_model=dict)
async def save_actions(
    incident_id: str,
    body: ActionsBody,
    claims: dict = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Save corrective and preventive action details."""
    updated = await incident_service.save_actions(
        incident_id=incident_id,
        corrective=body.corrective_action,
        preventive=body.preventive_action,
        action_date=body.action_date,
        action_time=body.action_time,
        action_status=body.action_status,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return {"updated": True}


# ── JCI compliance fields ─────────────────────────────────────────────────────
# Single unified handler covering all JCI 8th Edition fields:
#   - Compliance metadata  (jci_chapter, jci_standard, jci_measurable_element,
#                           jci_compliance_status, jci_evidence, jci_gap_analysis,
#                           jci_action_plan)
#   - Disclosure & patient safety fields  (disclosure_date, disclosure_method,
#                           disclosure_responsible, vulnerable_patient,
#                           vulnerable_population_type, workplace_violence,
#                           medication_error_merp_category)
#
# Previously two PATCH handlers were registered on the same route; FastAPI
# silently used only the last one, making the compliance fields unreachable.
# Both field sets are now merged into JCIFieldsBody so a single handler serves
# all JCI-related updates.  Only fields explicitly included in the request body
# are written (exclude_unset=True).

class JCIFieldsBody(BaseModel):
    # JCI 8th Edition compliance metadata
    jci_chapter: JCIChapter | None = None
    jci_standard: str | None = None
    jci_measurable_element: str | None = None
    jci_compliance_status: JCIComplianceStatus | None = None
    jci_evidence: str | None = None
    jci_gap_analysis: str | None = None
    jci_action_plan: str | None = None
    # Disclosure & patient-safety supplementary fields
    disclosure_date: Optional[date] = None
    disclosure_method: Optional[DisclosureMethod] = None
    disclosure_responsible: Optional[str] = None
    vulnerable_patient: Optional[bool] = None
    vulnerable_population_type: Optional[VulnerablePopulationType] = None
    workplace_violence: Optional[bool] = None
    medication_error_merp_category: Optional[str] = None


@router.patch("/{incident_id}/jci-fields", response_model=dict)
async def save_jci_fields(
    incident_id: str,
    body: JCIFieldsBody,
    claims: dict = Depends(
        require_role(
            UserRole.quality_admin,
            UserRole.administration_manager,
            UserRole.governorate_manager,
            UserRole.top_management,
        )
    ),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Persist JCI 8th Edition compliance and disclosure metadata for an incident.

    Only fields supplied in the request body are written; omitted fields are
    left unchanged.  Restricted to quality_admin and above.
    """
    updates = body.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No JCI fields provided.",
        )
    audit_entry = build_audit_entry(user_id=claims["user_id"], action="jci_fields_saved")
    result = await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": updates,
            "$push": {"audit_trail": audit_entry},
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return {"updated": True, "fields_set": list(updates.keys())}


# ── Final report ──────────────────────────────────────────────────────────────

class FinalReportBody(BaseModel):
    final_report: str


@router.post("/{incident_id}/final", response_model=dict)
async def submit_final_report(
    incident_id: str,
    body: FinalReportBody,
    claims: dict = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Submit the final report and mark the incident as Completed."""
    updated = await incident_service.save_final_report(
        incident_id=incident_id,
        report_text=body.final_report,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return {"updated": True, "status": IncidentStatus.Completed.value}


# ── AI feedback ───────────────────────────────────────────────────────────────

class AIFeedbackBody(BaseModel):
    ai_suggested: str
    human_chose: str


@router.post("/{incident_id}/ai-feedback", response_model=dict)
async def submit_ai_feedback(
    incident_id: str,
    body: AIFeedbackBody,
    claims: dict = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """Log Quality Admin accept/override decision on AI suggestion.

    This feedback is stored in ai_metadata.feedback and is the primary
    source of labelled training data for future model fine-tuning.
    """
    updated = await incident_service.save_ai_feedback(
        incident_id=incident_id,
        ai_suggested=body.ai_suggested,
        human_chose=body.human_chose,
        reviewer_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return {"updated": True, "human_reviewed": True}