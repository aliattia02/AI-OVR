"""backend/app/routers/incidents.py — API routes for creating, reading, updating, and deleting incident reports in E·OVR."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.incident import IncidentCreate, IncidentResponse
from app.services import email_service, incident_service
from app.utils.enums import ActionStatus, IncidentStatus, Probability, ReporterType, Severity, UserRole

router = APIRouter(prefix="/incidents", tags=["incidents"])


class StatusUpdateRequest(BaseModel):
    """Payload for incident status transition."""

    status: IncidentStatus


class AssessmentUpdateRequest(BaseModel):
    """Payload for quality assessment data."""

    severity: Severity
    probability: Probability


class ActionsUpdateRequest(BaseModel):
    """Payload for corrective and preventive actions."""

    corrective_action: str | None = None
    preventive_action: str | None = None
    action_date: date | None = None
    action_time: str | None = None
    action_status: ActionStatus


class FinalReportRequest(BaseModel):
    """Payload for final report submission."""

    final_report: str


class AIFeedbackRequest(BaseModel):
    """Payload for AI classification feedback."""

    ai_suggested: str | None = None
    human_chose: str | None = None


class MessageResponse(BaseModel):
    """Generic response message payload."""

    message: str


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


async def _get_quality_admin_email(db: AsyncIOMotorDatabase, facility_name: str) -> str | None:
    quality_admin_doc = await db["users"].find_one(
        {"role": UserRole.quality_admin.value, "facility_name": facility_name, "is_active": True},
        {"_id": 0, "email": 1},
    )
    if quality_admin_doc and quality_admin_doc.get("email"):
        return str(quality_admin_doc["email"])
    return None


@router.get(
    "/",
    response_model=list[IncidentResponse],
)
async def list_incidents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    claims: dict[str, Any] = Depends(
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
    return await incident_service.get_incidents(
        role=claims["role"],
        claims=claims,
        db=db,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_incident(
    payload: IncidentCreate,
    claims: dict[str, Any] = Depends(require_role(UserRole.staff, UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> IncidentResponse:
    # on-submit AI classification hook is inside incident_service.create_incident() — not in the router.
    incident = await incident_service.create_incident(
        data=payload,
        reporter_type=ReporterType.staff,
        user_id=claims.get("user_id"),
        db=db,
    )

    quality_admin_email = await _get_quality_admin_email(db=db, facility_name=incident.facility_name)
    if quality_admin_email:
        await email_service.send_submission_alert(
            to_email=quality_admin_email,
            incident_id=incident.incident_id,
            facility=incident.facility_name,
            severity=incident.severity.value,
        )

    return IncidentResponse.model_validate(incident)


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
)
async def get_incident(
    incident_id: str,
    claims: dict[str, Any] = Depends(
        require_role(
            UserRole.patient,
            UserRole.staff,
            UserRole.quality_admin,
            UserRole.administration_manager,
            UserRole.governorate_manager,
            UserRole.top_management,
        )
    ),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> IncidentResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()
    return IncidentResponse.model_validate(incident)


@router.patch("/{incident_id}/status", response_model=MessageResponse)
async def update_incident_status(
    incident_id: str,
    payload: StatusUpdateRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()

    updated = await incident_service.update_status(
        incident_id=incident_id,
        new_status=payload.status,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise _bad_request("Invalid status transition")
    return MessageResponse(message="Status updated")


@router.patch("/{incident_id}/assessment", response_model=MessageResponse)
async def update_assessment(
    incident_id: str,
    payload: AssessmentUpdateRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()

    updated = await incident_service.save_assessment(
        incident_id=incident_id,
        severity=payload.severity,
        probability=payload.probability,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise _not_found()
    return MessageResponse(message="Assessment updated")


@router.patch("/{incident_id}/actions", response_model=MessageResponse)
async def update_actions(
    incident_id: str,
    payload: ActionsUpdateRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()

    updated = await incident_service.save_actions(
        incident_id=incident_id,
        corrective=payload.corrective_action,
        preventive=payload.preventive_action,
        action_date=payload.action_date,
        action_time=payload.action_time,
        action_status=payload.action_status,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise _not_found()
    return MessageResponse(message="Actions updated")


@router.post("/{incident_id}/final", response_model=MessageResponse)
async def submit_final_report(
    incident_id: str,
    payload: FinalReportRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()

    updated = await incident_service.save_final_report(
        incident_id=incident_id,
        report_text=payload.final_report,
        user_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise _not_found()
    return MessageResponse(message="Final report submitted")


@router.post("/{incident_id}/ai-feedback", response_model=MessageResponse)
async def submit_ai_feedback(
    incident_id: str,
    payload: AIFeedbackRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise _not_found()

    updated = await incident_service.save_ai_feedback(
        incident_id=incident_id,
        ai_suggested=payload.ai_suggested,
        human_chose=payload.human_chose,
        reviewer_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise _not_found()
    return MessageResponse(message="AI feedback saved")
