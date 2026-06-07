"""backend/app/utils/enums.py — Enumerations for incident types, severity levels, statuses, and user roles used throughout E·OVR.

GAHAR migration changes:
  - Severity: added Catastrophic as the new highest tier (replaces the JCI 3-level Major/Moderate/Minor scale).
  - Probability: replaced Low/Medium/High (JCI 3-level) with
    Frequent/Occasional/Uncommon/Remote (GAHAR 4-level SAC scale).
  - ErrorClassification: added WorkplaceViolence and Environmental (moved here
    from the broken Enum() factory block in incident.py — fixes the 500 on list).

EN fields migration:
  - FacilityType values remain Arabic strings (stored in DB as Arabic) so that
    existing incidents and facility documents are not invalidated.
  - FACILITY_TYPE_EN provides a mapping from Arabic value → English label for
    display purposes (API responses, frontend dropdowns).
"""

from enum import Enum


class IncidentStatus(str, Enum):
    """Lifecycle state of an incident report, from initial submission through resolution."""

    Created = "Created"
    InProgress = "InProgress"
    Evaluating = "Evaluating"
    MoreInfoNeeded = "MoreInfoNeeded"
    ActionTaken = "ActionTaken"
    Completed = "Completed"


class Severity(str, Enum):
    """Clinical or operational severity of the incident.

    GAHAR SAC scale (4 levels, highest → lowest):
      Catastrophic — patient death or permanent harm / sentinel event
      Major        — serious but non-permanent harm
      Moderate     — significant but recoverable harm
      Minor        — minimal or no patient harm
    """

    Catastrophic = "Catastrophic"
    Major = "Major"
    Moderate = "Moderate"
    Minor = "Minor"


class Probability(str, Enum):
    """Likelihood of a similar incident recurring.

    GAHAR SAC scale (4 levels, most → least likely):
      Frequent   — expected to occur several times per year
      Occasional — expected to occur once per year or less
      Uncommon   — may occur once every 2–5 years
      Remote     — unlikely; may occur once in > 5 years
    """

    Frequent = "Frequent"
    Occasional = "Occasional"
    Uncommon = "Uncommon"
    Remote = "Remote"


class ErrorClassification(str, Enum):
    """Consolidated 14-category incident taxonomy.

    Replaces both the old 8-class GAHAR-era taxonomy (Medication, Administrative,
    Clinical, Equipment, InfectionControl, Falls, Documentation, Behavior) and the
    separate IncidentMainCategory field.  Legacy values are coerced in
    IncidentInDB._coerce_legacy_error_classification.
    """

    PatientSafety               = "PatientSafety"
    MedicationSafety            = "MedicationSafety"
    InfectionPrevention         = "InfectionPrevention"
    BloodTransfusion            = "BloodTransfusion"
    Laboratory                  = "Laboratory"
    RadiologyDiagnostic         = "RadiologyDiagnostic"
    MedicalEquipment            = "MedicalEquipment"
    FacilityEnvironmental       = "FacilityEnvironmental"
    OccupationalHealthStaff     = "OccupationalHealthStaff"
    Security                    = "Security"
    InformationTechnology       = "InformationTechnology"
    AdministrativeProcess       = "AdministrativeProcess"
    PatientExperienceComplaints = "PatientExperienceComplaints"
    FireDisaster                = "FireDisaster"


class EventType(str, Enum):
    """Classification of the reported event according to its outcome and potential impact."""

    IncidentEvent = "IncidentEvent"
    NearMiss = "NearMiss"
    AdverseEvent = "AdverseEvent"
    SignificantEvent = "SignificantEvent"
    SentinelEvent = "SentinelEvent"


class ActionStatus(str, Enum):
    """Current completion state of a corrective or preventive action item."""

    Pending = "Pending"
    InProgress = "InProgress"
    Completed = "Completed"


class ReporterType(str, Enum):
    """Indicates whether the person submitting the report is a patient or a staff member."""

    patient = "patient"
    staff = "staff"


class UserRole(str, Enum):
    """Access-control role assigned to a user account, governing what the user can view and do."""

    patient = "patient"
    staff = "staff"
    quality_admin = "quality_admin"
    administration_manager = "administration_manager"
    governorate_manager = "governorate_manager"
    top_management = "top_management"


class FacilityType(str, Enum):
    """Arabic label for the type of healthcare facility.

    Values are stored in Arabic in MongoDB so that existing incidents and
    facility documents remain valid.  Use FACILITY_TYPE_EN for English display.
    """

    hospital = "مستشفى"
    center = "مركز"
    unit = "وحدة"


# English display labels for FacilityType — keyed by the Arabic stored value.
# Use this wherever you need to show the English name without touching the DB schema.
# Example: FACILITY_TYPE_EN.get(facility.facility_type.value, facility.facility_type.value)
FACILITY_TYPE_EN: dict[str, str] = {
    "مستشفى": "Hospital",
    "مركز":   "Health Center",
    "وحدة":   "Health Unit",
}


class EventDiscoveryMethod(str, Enum):
    """How the event was first identified / brought to attention."""

    SelfReported           = "SelfReported"
    SupervisorReported     = "SupervisorReported"
    PatientComplaint       = "PatientComplaint"
    AuditFinding           = "AuditFinding"
    IncidentInvestigation  = "IncidentInvestigation"
    Other                  = "Other"


class NCCMERPCategory(str, Enum):
    """NCC MERP Index classification for medication error severity (A–I)."""

    A = "A"  # Circumstances with capacity to cause error — no error occurred
    B = "B"  # Error occurred but did not reach the patient
    C = "C"  # Error reached patient, no harm
    D = "D"  # Error reached patient, required monitoring/intervention to confirm no harm
    E = "E"  # Temporary harm requiring intervention
    F = "F"  # Temporary harm requiring initial or prolonged hospitalisation
    G = "G"  # Permanent patient harm
    H = "H"  # Intervention required to sustain life
    I = "I"  # Patient death


class MedicationErrorStage(str, Enum):
    """Stage in the medication use process at which the error occurred."""

    Prescribing    = "Prescribing"
    Transcribing   = "Transcribing"
    Dispensing     = "Dispensing"
    Preparation    = "Preparation"
    Administration = "Administration"
    Monitoring     = "Monitoring"


class AIProvider(str, Enum):
    """External AI/LLM provider used for automated analysis features; 'none' disables AI."""

    none = "none"
    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    custom = "custom"


class ModelType(str, Enum):
    """Functional category of a machine-learning model registered in the AI model registry."""

    classification = "classification"
    similarity = "similarity"
    risk_scoring = "risk_scoring"
    signal_detection = "signal_detection"