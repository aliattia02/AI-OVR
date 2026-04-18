"""backend/app/routers/facilities.py — API routes for managing healthcare facility records in E·OVR."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.models.facility import FacilityResponse
from app.services import facility_service

router = APIRouter(prefix="/facilities", tags=["facilities"])


@router.get("/", response_model=list[FacilityResponse])
async def list_facilities(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[FacilityResponse]:
    return await facility_service.get_facilities(db)


@router.get("/cascading", response_model=dict)
async def get_cascading_options(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    return await facility_service.get_cascading_options(db)
