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
    patient_link_uuid: str        # UUID v4
    created_at: datetime


class FacilityResponse(BaseModel):
    """Facility document serialised for API responses (no raw ``_id``)."""

    governorate: str
    facility_type: FacilityType
    administration: str
    facility_name: str
    patient_link_uuid: str
    created_at: datetime
