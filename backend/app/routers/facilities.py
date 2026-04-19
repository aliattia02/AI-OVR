"""backend/app/routers/facilities.py — API routes for managing healthcare facility records in E·OVR."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.facility import FacilityResponse, FacilitySafeResponse
from app.services import facility_service
from app.utils.enums import UserRole

router = APIRouter(prefix="/facilities", tags=["facilities"])


@router.get("/", response_model=list[FacilitySafeResponse])
async def list_facilities(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[FacilitySafeResponse]:
    """
    Public endpoint — returns facility list for cascading dropdowns.
    patient_link_uuid is intentionally excluded from this response.
    Only /patients/token/{facility_id} (top_management only) exposes the UUID.
    """
    return await facility_service.get_facilities_safe(db)


@router.get("/cascading", response_model=dict)
async def get_cascading_options(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """
    Public endpoint — returns nested { governorates, administrations, facilities }
    for cascading dropdowns in patient and staff forms.
    No UUIDs included.
    """
    return await facility_service.get_cascading_options(db)


@router.get("/full", response_model=list[FacilityResponse])
async def list_facilities_full(
    claims: dict = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[FacilityResponse]:
    """
    Top management only — returns full facility records including patient_link_uuid.
    Used for administrative management, not for dropdowns.
    """
    _ = claims
    return await facility_service.get_facilities(db)