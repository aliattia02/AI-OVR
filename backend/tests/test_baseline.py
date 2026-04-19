import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "ai_ovr_test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from app.routers.patients import PatientSubmitResponse
from app.services.incident_service import _ALLOWED_TRANSITIONS
from app.utils.enums import IncidentStatus, Probability, Severity
from app.utils.helpers import compute_risk_score


def test_risk_matrix_baseline_values():
    assert compute_risk_score(Severity.Major, Probability.High) == 9
    assert compute_risk_score(Severity.Major, Probability.Medium) == 6
    assert compute_risk_score(Severity.Major, Probability.Low) == 3
    assert compute_risk_score(Severity.Moderate, Probability.High) == 6
    assert compute_risk_score(Severity.Moderate, Probability.Medium) == 4
    assert compute_risk_score(Severity.Moderate, Probability.Low) == 2
    assert compute_risk_score(Severity.Minor, Probability.High) == 3
    assert compute_risk_score(Severity.Minor, Probability.Medium) == 2
    assert compute_risk_score(Severity.Minor, Probability.Low) == 1


def test_status_transition_baseline_rules():
    assert _ALLOWED_TRANSITIONS[IncidentStatus.Created] == {IncidentStatus.InProgress}
    assert _ALLOWED_TRANSITIONS[IncidentStatus.InProgress] == {IncidentStatus.Evaluating}
    assert _ALLOWED_TRANSITIONS[IncidentStatus.Evaluating] == {
        IncidentStatus.ActionTaken,
        IncidentStatus.MoreInfoNeeded,
    }
    assert _ALLOWED_TRANSITIONS[IncidentStatus.MoreInfoNeeded] == {IncidentStatus.Evaluating}
    assert _ALLOWED_TRANSITIONS[IncidentStatus.ActionTaken] == {IncidentStatus.Completed}
    assert _ALLOWED_TRANSITIONS[IncidentStatus.Completed] == set()


def test_patient_submit_response_is_minimal_shape():
    payload = PatientSubmitResponse(incident_id="OVR-2026-001", message="Report submitted successfully")
    assert payload.model_dump() == {
        "incident_id": "OVR-2026-001",
        "message": "Report submitted successfully",
    }
