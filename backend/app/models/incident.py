"""backend/app/models/incident.py — Pydantic and ODM models defining the Incident document schema for E·OVR."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.ai_metadata import AIMetadata
from app.utils.enums import (
    ActionStatus,
    ErrorClassification,
    EventType,
    FacilityType,
    IncidentStatus,
    Probability,
    ReporterType,
    Severity,
)


class IncidentCreate(BaseModel):
    """Fields submitted when a reporter files a new incident."""

    # Required
    occurrence_date: date
    occurrence_time: str                          # HH:MM
    description: str
    occurrence_location: str
    reporting_department: str
    error_classification: ErrorClassification
    event_type: EventType
    severity: Severity
    facility_name: str
    facility_type: FacilityType
    governorate: str
    reporter_role: str
    involved_person: str

    # Optional
    responsible_manager: Optional[str] = None
    recommendations: Optional[str] = None
    notes: Optional[str] = None
    specific_error: Optional[str] = None
    medical_file_number: Optional[str] = None


class IncidentInDB(IncidentCreate):
    """Full incident document as stored in MongoDB.

    ``id`` is the MongoDB ``_id``; ``incident_id`` is the human-readable
    reference code assigned at creation.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(None, alias="_id")
    incident_id: str
    status: IncidentStatus = IncidentStatus.Created
    probability: Optional[Probability] = None
    risk_score: Optional[int] = None
    reporter_type: ReporterType
    reporter_user_id: Optional[str] = None
    administration: str
    attachments: List[Any] = Field(default_factory=list)
    audit_trail: List[Any] = Field(default_factory=list)
    registration_date: datetime
    report_date: Optional[date] = None
    report_time: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    action_date: Optional[date] = None
    action_time: Optional[str] = None
    action_status: ActionStatus = ActionStatus.Pending
    final_report: Optional[str] = None
    ai_metadata: AIMetadata = Field(default_factory=AIMetadata)


class IncidentResponse(IncidentInDB):
    """Incident document serialised for API responses.

    Identical to ``IncidentInDB`` but uses field names for serialisation
    (``id`` instead of the MongoDB alias ``_id``), keeping raw storage
    internals out of the public API.
    """

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=False)
