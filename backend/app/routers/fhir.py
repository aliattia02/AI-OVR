"""backend/app/routers/fhir.py — FHIR R4 translation endpoints for E·OVR incidents."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.services import incident_service
from app.services.fhir_service import build_adverse_event, build_adverse_event_bundle
from app.utils.enums import UserRole

router = APIRouter(prefix="/fhir/r4", tags=["fhir"])


@router.get("/AdverseEvent", response_model=dict)
async def list_adverse_events(
    skip: int = 0,
    limit: int = 50,
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
) -> dict:
    """Return AdverseEvent resources for incidents scoped to the caller's tier."""
    incidents = await incident_service.get_incidents(
        role=claims["role"],
        claims=claims,
        db=db,
        skip=skip,
        limit=limit,
    )
    return build_adverse_event_bundle(incidents)


@router.get("/AdverseEvent/{incident_id}", response_model=dict)
async def get_adverse_event(
    incident_id: str,
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
) -> dict:
    """Return a single AdverseEvent resource for an incident."""
    incident = await incident_service.get_incident_by_id(
        incident_id=incident_id,
        role=claims["role"],
        claims=claims,
        db=db,
    )
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return build_adverse_event(incident)
