"""backend/app/models/facility.py — Pydantic and ODM models defining the Facility document schema for E·OVR."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.utils.enums import FacilityType


class FacilityInDB(BaseModel):
    """Full facility document as stored in MongoDB.

    ``id`` maps to the MongoDB ``_id``; ``patient_link_uuid`` is a UUID v4
    string used to associate anonymous patient submissions with the facility.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(None, alias="_id")
    governorate: str
    facility_type: FacilityType
    administration: str
    facility_name: str
    facility_type_en: Optional[str] = None      # English label e.g. "Hospital"
    administration_en: Optional[str] = None     # English label e.g. "Aswan Administration"
    facility_name_en: Optional[str] = None      # English label e.g. "Aswan Specialized Hospital"
    patient_link_uuid: str                       # UUID v4 — never expose on public endpoints
    created_at: datetime


class FacilityResponse(BaseModel):
    """Full facility response including patient_link_uuid.
    Only returned to top_management via /facilities/full.
    Never returned on public endpoints.
    """

    facility_id: str          # MongoDB _id as string — used by AdminProvision dropdown
    governorate: str
    facility_type: FacilityType
    administration: str
    facility_name: str
    facility_type_en: Optional[str] = None
    administration_en: Optional[str] = None
    facility_name_en: Optional[str] = None
    patient_link_uuid: str
    created_at: datetime


class FacilitySafeResponse(BaseModel):
    """Safe facility response for public endpoints — patient_link_uuid excluded.
    Used by GET /facilities/ and GET /facilities/cascading.
    The UUID is only accessible via GET /patients/token/{facility_id} (top_management only).
    """

    governorate: str
    facility_type: FacilityType
    administration: str
    facility_name: str
    facility_type_en: Optional[str] = None
    administration_en: Optional[str] = None
    facility_name_en: Optional[str] = None
    created_at: datetime