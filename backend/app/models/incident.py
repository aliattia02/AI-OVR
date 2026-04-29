"""backend/app/models/incident.py — Pydantic and ODM models defining the Incident document schema for E·OVR."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
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


class DisclosureMethod(str, Enum):
    verbal = "verbal"
    written = "written"
    not_yet = "not_yet"


class VulnerablePopulationType(str, Enum):
    pediatric = "pediatric"
    elderly = "elderly"
    mental_health = "mental_health"
    end_of_life = "end_of_life"
    other = "other"


_ERROR_CLASSIFICATION_VALUES = {member.name: member.value for member in ErrorClassification}
_ERROR_CLASSIFICATION_VALUES["WorkplaceViolence"] = "WorkplaceViolence"
# JCI 8th Ed. mandatory from 2026-01-01; activate via ENABLE_ENV_INCIDENTS env flag
_ERROR_CLASSIFICATION_VALUES["Environmental"] = "Environmental"
ErrorClassification = Enum("ErrorClassification", _ERROR_CLASSIFICATION_VALUES, type=str)


class JCIChapter(str, Enum):
    """JCI 8th Edition chapter identifiers used for compliance tagging."""

    IPSG = "IPSG"
    ACC = "ACC"
    PFR = "PFR"
    AOP = "AOP"
    COP = "COP"
    ASC = "ASC"
    MMU = "MMU"
    PFE = "PFE"
    QPS = "QPS"
    PCI = "PCI"
    GLD = "GLD"
    FMS = "FMS"
    SQE = "SQE"
    MCI = "MCI"


class JCIComplianceStatus(str, Enum):
    """Compliance rating for a JCI measurable element."""

    Met = "Met"
    PartiallyMet = "PartiallyMet"
    NotMet = "NotMet"
    NotApplicable = "NotApplicable"


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
    # JCI 8th Edition compliance fields — all Optional; dormant until UI activates them
    disclosure_date: Optional[date] = None
    disclosure_method: Optional[DisclosureMethod] = None
    disclosure_responsible: Optional[str] = None
    vulnerable_patient: Optional[bool] = None
    vulnerable_population_type: Optional[VulnerablePopulationType] = None
    workplace_violence: Optional[bool] = None
    medication_error_merp_category: Optional[str] = None  # NCC MERP A–I


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
    ai_metadata: AIMetadata = Field(default_factory=AIMetadata.empty)
    jci_chapter: Optional[JCIChapter] = None
    jci_standard: Optional[str] = None
    jci_measurable_element: Optional[str] = None
    jci_compliance_status: Optional[JCIComplianceStatus] = None
    jci_evidence: Optional[str] = None
    jci_gap_analysis: Optional[str] = None
    jci_action_plan: Optional[str] = None

class IncidentResponse(IncidentInDB):
    """Incident document serialised for API responses.

    Identical to ``IncidentInDB`` but uses field names for serialisation
    (``id`` instead of the MongoDB alias ``_id``), keeping raw storage
    internals out of the public API.
    """

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=False)
