"""backend/app/models/incident.py — Pydantic and ODM models defining the Incident document schema for E·OVR.

GAHAR migration changes:
  - JCIChapter and JCIComplianceStatus replaced by GAHARSection and GAHARComplianceStatus.
  - IncidentInDB: jci_* fields (7) replaced by gahar_* fields (7).

Fix (500 on GET /incidents/):
  - Removed the broken dynamic Enum() factory that was shadowing ErrorClassification.
    The factory used Enum("ErrorClassification", ..., type=str) which produces members
    that are NOT proper str subclasses; Pydantic v2 then rejects any stored value with
    a validation error → 500.  WorkplaceViolence and Environmental now live in enums.py
    as first-class members of the proper class ErrorClassification(str, Enum).
  - Added _coerce_legacy_error_classification validator to IncidentInDB so that documents
    created before the GAHAR migration (which stored different classification names) still
    deserialise without a ValidationError while the DB migration is pending.

Fix (infinite loading on GET /incidents/ after GAHAR migration):
  - _LEGACY_PROBABILITY and _LEGACY_ERROR_CLASSIFICATION annotated as ClassVar[dict].
    Without ClassVar, Pydantic v2 treated both dicts as model fields, causing a
    ValidationError on every document with a legacy probability value (e.g. "Medium")
    → FastAPI 500 → React Query throwOnError propagated silently past IncidentList's
    error handler → page hung indefinitely with no console output.
  - IncidentCreate now sets extra='ignore' in model_config so that legacy jci_* fields
    still present in existing MongoDB documents are silently discarded on read instead
    of raising an unexpected-keyword-argument error.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, ClassVar, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.ai_metadata import AIMetadata
from app.utils.enums import (
    ActionStatus,
    ErrorClassification,
    EventDiscoveryMethod,
    EventType,
    FacilityType,
    IncidentStatus,
    MedicationErrorStage,
    NCCMERPCategory,
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


# ── DO NOT add a dynamic Enum() factory for ErrorClassification here. ─────────
# WorkplaceViolence and Environmental are now proper members of
# ErrorClassification in app/utils/enums.py.  The old factory block:
#
#   _ERROR_CLASSIFICATION_VALUES = {member.name: member.value for member in ErrorClassification}
#   _ERROR_CLASSIFICATION_VALUES["WorkplaceViolence"] = "WorkplaceViolence"
#   _ERROR_CLASSIFICATION_VALUES["Environmental"]     = "Environmental"
#   ErrorClassification = Enum("ErrorClassification", _ERROR_CLASSIFICATION_VALUES, type=str)
#
# was the root cause of the 500: Enum(..., type=str) does NOT produce proper
# str subclasses, so Pydantic v2 raised a ValidationError on every document
# that had error_classification set, crashing the entire list endpoint.
# ─────────────────────────────────────────────────────────────────────────────


class GAHARSection(str, Enum):
    """GAHAR accreditation section codes (14 sections, replaces JCI chapters)."""

    PCC = "PCC"   # Patient-Centeredness Culture
    ACT = "ACT"   # Access, Continuity & Transition
    ICD = "ICD"   # Integrated Care Delivery
    CSS = "CSS"   # Critical & Special Care Services
    DAS = "DAS"   # Diagnostic & Ancillary Services
    SAS = "SAS"   # Surgery, Anesthesia & Sedation
    MMS = "MMS"   # Medication Management & Safety
    EFS = "EFS"   # Environmental & Facility Safety
    IPC = "IPC"   # Infection Prevention & Control
    OGM = "OGM"   # Organization Governance & Management
    CAI = "CAI"   # Community Assessment & Involvement
    WFM = "WFM"   # Workforce Management
    IMT = "IMT"   # Information Management & Technology
    QPI = "QPI"   # Quality & Performance Improvement


class GAHARComplianceStatus(str, Enum):
    """Compliance assessment outcome for a GAHAR standard (replaces JCIComplianceStatus)."""

    Met = "Met"
    PartiallyMet = "PartiallyMet"
    NotMet = "NotMet"
    NotApplicable = "NotApplicable"


class IncidentCreate(BaseModel):
    """Fields submitted when a reporter files a new incident."""

    # extra='ignore' discards any unrecognised fields (e.g. legacy jci_* fields
    # still present in existing MongoDB documents) instead of raising a
    # ValidationError.  This is safe here because IncidentCreate is used both
    # for form submissions (where unknown fields should be ignored) and as the
    # base class for IncidentInDB (where the same protection is needed for old
    # DB documents that have not yet been migrated).
    model_config = ConfigDict(extra="ignore")

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
    # GAHAR disclosure & patient-safety fields — all Optional; accreditation-agnostic
    disclosure_date: Optional[date] = None
    disclosure_method: Optional[DisclosureMethod] = None
    disclosure_responsible: Optional[str] = None
    vulnerable_patient: Optional[bool] = None
    vulnerable_population_type: Optional[VulnerablePopulationType] = None
    workplace_violence: Optional[bool] = None
    medication_error_merp_category: Optional[str] = None  # NCC MERP A–I

    # ── New intake fields ─────────────────────────────────────────────────────
    # How the event was identified before formal reporting
    event_discovery_method: Optional[EventDiscoveryMethod] = None
    # Medication-safety sub-fields — only relevant when error_classification = MedicationSafety
    medication_stage_of_error: Optional[MedicationErrorStage] = None
    medication_merp_category:  Optional[NCCMERPCategory] = None


class IncidentInDB(IncidentCreate):
    """Full incident document as stored in MongoDB.

    ``id`` is the MongoDB ``_id``; ``incident_id`` is the human-readable
    reference code assigned at creation.
    """

    # Inherits extra='ignore' from IncidentCreate; populate_by_name=True added
    # here so that the aliased ``id`` field can be populated from either ``id``
    # or the MongoDB alias ``_id``.
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: Optional[str] = Field(None, alias="_id")
    incident_id: str
    status: IncidentStatus = IncidentStatus.Created

    # ── GAHAR migration: coerce legacy JCI probability values on read ─────────
    # Documents created before the GAHAR migration may have probability stored as
    # "High", "Medium", or "Low" (JCI 3-level scale).  This validator silently
    # maps them to the nearest GAHAR 4-level equivalent so old documents load
    # without a ValidationError while the DB migration is pending.
    # Once migrate_gahar_probability.py has been run, this becomes a no-op.
    #
    # IMPORTANT: ClassVar is required here.  Without it, Pydantic v2 treats the
    # dict as a model field, breaking field-type resolution for ``probability``
    # and causing a ValidationError (→ 500) on every document that carries a
    # legacy value such as "Medium".
    _LEGACY_PROBABILITY: ClassVar[dict[str, str]] = {
        "High":   "Frequent",
        "Medium": "Occasional",
        "Low":    "Remote",
    }

    @field_validator("probability", mode="before")
    @classmethod
    def _coerce_legacy_probability(cls, v: object) -> object:
        if isinstance(v, str):
            return cls._LEGACY_PROBABILITY.get(v, v)
        return v

    # ── Legacy error_classification coercion ──────────────────────────────────
    # Documents created before the GAHAR / taxonomy consolidation may have stored
    # verbose classification names (e.g. "MedicationError", "PatientFall") that
    # no longer match the canonical ErrorClassification enum values.  Map them
    # silently so old docs still load while a DB migration is pending.
    # Once all documents are updated, this validator becomes a no-op.
    #
    # IMPORTANT: ClassVar is required for the same reason as _LEGACY_PROBABILITY
    # above — without it Pydantic v2 treats this dict as a model field.
    _LEGACY_ERROR_CLASSIFICATION: ClassVar[dict[str, str]] = {
        # Pre-GAHAR migration verbose names
        "MedicationError":           "MedicationSafety",
        "ClinicalManagement":        "PatientSafety",
        "DiagnosisError":            "PatientSafety",
        "PatientFall":               "PatientSafety",
        "HospitalAcquiredInfection": "InfectionPrevention",
        "SurgicalProcedureError":    "PatientSafety",
        "EquipmentFailure":          "MedicalEquipment",
        "DocumentationError":        "AdministrativeProcess",
        "CommunicationError":        "AdministrativeProcess",
        "BloodTransfusionError":     "BloodTransfusion",
        "NoHarm":                    "PatientSafety",
        "UnsafeCondition":           "FacilityEnvironmental",
        "Other":                     "AdministrativeProcess",
        # GAHAR-era 8-class taxonomy → consolidated 14-category taxonomy
        "Medication":                "MedicationSafety",
        "Administrative":            "AdministrativeProcess",
        "Clinical":                  "PatientSafety",
        "Equipment":                 "MedicalEquipment",
        "InfectionControl":          "InfectionPrevention",
        "Falls":                     "PatientSafety",
        "Documentation":             "AdministrativeProcess",
        "Behavior":                  "PatientSafety",
        "WorkplaceViolence":         "Security",
        "Environmental":             "FacilityEnvironmental",
    }

    @field_validator("error_classification", mode="before")
    @classmethod
    def _coerce_legacy_error_classification(cls, v: object) -> object:
        if isinstance(v, str):
            return cls._LEGACY_ERROR_CLASSIFICATION.get(v, v)
        return v

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
    # GAHAR accreditation compliance fields (replaces jci_* fields)
    gahar_section: Optional[GAHARSection] = None
    gahar_gsr_code: Optional[str] = None          # e.g. "GSR.01" – "GSR.29"
    gahar_standard_code: Optional[str] = None     # book code e.g. "ACT.03"
    gahar_compliance_status: Optional[GAHARComplianceStatus] = None
    gahar_evidence: Optional[str] = None
    gahar_gap_analysis: Optional[str] = None
    gahar_action_plan: Optional[str] = None


class IncidentResponse(IncidentInDB):
    """Incident document serialised for API responses.

    Identical to ``IncidentInDB`` but uses field names for serialisation
    (``id`` instead of the MongoDB alias ``_id``), keeping raw storage
    internals out of the public API.
    """

    model_config = ConfigDict(extra="ignore", populate_by_name=True, serialize_by_alias=False)