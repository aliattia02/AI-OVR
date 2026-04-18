"""backend/app/utils/enums.py — Enumerations for incident types, severity levels, statuses, and user roles used throughout E·OVR."""

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
    """Clinical or operational severity of the incident, used for triage and prioritisation."""

    Minor = "Minor"
    Moderate = "Moderate"
    Major = "Major"


class Probability(str, Enum):
    """Likelihood of a similar incident recurring, used in risk-matrix calculations."""

    Low = "Low"
    Medium = "Medium"
    High = "High"


class ErrorClassification(str, Enum):
    """Category of the error or near-miss as defined by the facility's taxonomy."""

    Medication = "Medication"
    Administrative = "Administrative"
    Clinical = "Clinical"
    Equipment = "Equipment"
    InfectionControl = "InfectionControl"
    Falls = "Falls"
    Documentation = "Documentation"
    Behavior = "Behavior"


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
    """Arabic label for the type of healthcare facility, stored and displayed in Arabic."""

    hospital = "مستشفى"
    center = "مركز"
    unit = "وحدة"


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
