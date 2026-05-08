"""backend/app/routers/patients.py — API routes for patient-facing incident submission and QR-code reporting in E·OVR."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.facility import FacilitySafeResponse
from app.models.incident import IncidentCreate
from app.services import email_service, facility_service, incident_service
from app.utils.enums import ErrorClassification, EventType, ReporterType, Severity, UserRole

router = APIRouter(prefix="/patients", tags=["patients"])


class PatientSubmitRequest(BaseModel):
    """Anonymous short patient submission form."""

    description: str
    occurrence_date: date | None = None
    occurrence_time: str | None = None
    occurrence_location: str | None = None
    reporter_role: str | None = None
    medical_file_number: str | None = None


class PatientSubmitResponse(BaseModel):
    """Public response for patient submission."""

    incident_id: str
    message: str


class PatientTokenResponse(BaseModel):
    """Response containing a facility's patient submission token."""

    patient_link_uuid: str


@router.get("/facility-info/{facility_uuid}", response_model=FacilitySafeResponse)
async def get_facility_info_by_patient_uuid(
    facility_uuid: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FacilitySafeResponse:
    """Public endpoint — returns safe facility metadata for the anonymous report form.
    Accepts the patient_link_uuid from the QR URL; never echoes it back in the response.
    """
    facility = await facility_service.get_facility_by_patient_uuid(facility_uuid, db)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    return FacilitySafeResponse(
        governorate=facility.governorate,
        facility_type=facility.facility_type,
        administration=facility.administration,
        facility_name=facility.facility_name,
        created_at=facility.created_at,
    )


@router.post("/submit/{facility_uuid}", response_model=PatientSubmitResponse)
async def submit_patient_incident(
    facility_uuid: str,
    payload: PatientSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> PatientSubmitResponse:
    facility = await facility_service.get_facility_by_patient_uuid(facility_uuid, db)
    if facility is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    now = datetime.now(tz=timezone.utc)
    occurrence_date = payload.occurrence_date or now.date()
    occurrence_time = payload.occurrence_time or now.strftime("%H:%M")

    incident_payload = IncidentCreate(
        description=payload.description,
        occurrence_date=occurrence_date,
        occurrence_time=occurrence_time,
        occurrence_location=payload.occurrence_location or "Patient submission",
        reporter_role=payload.reporter_role or "Patient",
        medical_file_number=payload.medical_file_number,
        reporting_department="Patient",
        error_classification=ErrorClassification.Administrative,
        event_type=EventType.IncidentEvent,
        severity=Severity.Minor,
        facility_name=facility.facility_name,
        facility_type=facility.facility_type,
        governorate=facility.governorate,
        involved_person="Patient",
    )

    incident = await incident_service.create_incident(
        data=incident_payload,
        reporter_type=ReporterType.patient,
        user_id=None,
        db=db,
    )

    quality_admin_email = await facility_service.get_quality_admin_email(facility.facility_name, db)
    if quality_admin_email:
        await email_service.send_submission_alert(
            to_email=quality_admin_email,
            incident_id=incident.incident_id,
            facility=incident.facility_name,
            severity=incident.severity.value,
        )

    return PatientSubmitResponse(
        incident_id=incident.incident_id,
        message="Report submitted successfully",
    )


@router.get("/token/{facility_id}", response_model=PatientTokenResponse)
async def get_facility_patient_token(
    facility_id: str,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> PatientTokenResponse:
    _ = claims
    query: dict[str, Any]
    if ObjectId.is_valid(facility_id):
        query = {"_id": ObjectId(facility_id)}
    else:
        query = {"facility_name": facility_id}

    doc = await db["facilities"].find_one(query, {"_id": 0, "patient_link_uuid": 1})
    if not doc or not doc.get("patient_link_uuid"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    return PatientTokenResponse(patient_link_uuid=str(doc["patient_link_uuid"]))