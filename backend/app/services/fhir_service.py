"""backend/app/services/fhir_service.py — Map E-OVR incidents to FHIR R4 AdverseEvent resources."""

from __future__ import annotations

from datetime import date, datetime
from typing import Iterable

from app.models.incident import IncidentInDB


def _get_value(incident: IncidentInDB | dict, field: str):
    if isinstance(incident, dict):
        return incident.get(field)
    return getattr(incident, field, None)


def _enum_value(value) -> str | None:
    if value is None:
        return None
    return getattr(value, "value", value)


def _to_date_time(occurrence_date: date | None, occurrence_time: str | None) -> str | None:
    if not occurrence_date:
        return None
    if occurrence_time:
        return f"{occurrence_date.isoformat()}T{occurrence_time}"
    return occurrence_date.isoformat()


def _to_iso(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _codeable_concept(system: str, code: str | None) -> dict | None:
    if not code:
        return None
    return {
        "coding": [
            {
                "system": system,
                "code": code,
            }
        ],
        "text": code,
    }


def _annotation(label: str, text: str | None) -> dict | None:
    if not text:
        return None
    return {"text": f"{label}: {text}"}


def build_adverse_event(incident: IncidentInDB | dict) -> dict:
    """Translate an incident document into a FHIR R4 AdverseEvent resource."""
    incident_id = _get_value(incident, "incident_id")
    adverse_event: dict = {
        "resourceType": "AdverseEvent",
        "actuality": "actual",
    }
    if incident_id:
        adverse_event["id"] = incident_id
        adverse_event["identifier"] = [
            {"system": "urn:eovr:incident-id", "value": incident_id}
        ]

    event_type = _enum_value(_get_value(incident, "event_type"))
    event_type_concept = _codeable_concept("urn:eovr:event-type", event_type)
    if event_type_concept:
        adverse_event["category"] = [event_type_concept]

    error_classification = _enum_value(_get_value(incident, "error_classification"))
    error_concept = _codeable_concept("urn:eovr:error-classification", error_classification)
    if error_concept:
        adverse_event["event"] = error_concept

    mrn = _get_value(incident, "medical_file_number")
    if mrn:
        adverse_event["subject"] = {
            "identifier": {"system": "urn:eovr:mrn", "value": mrn}
        }

    occurrence_date = _get_value(incident, "occurrence_date")
    occurrence_time = _get_value(incident, "occurrence_time")
    occurrence_datetime = _to_date_time(occurrence_date, occurrence_time)
    if occurrence_datetime:
        adverse_event["date"] = occurrence_datetime

    registration_date = _get_value(incident, "registration_date")
    recorded_date = _to_iso(registration_date)
    if recorded_date:
        adverse_event["recordedDate"] = recorded_date

    severity = _enum_value(_get_value(incident, "severity"))
    severity_concept = _codeable_concept("urn:eovr:severity", severity)
    if severity_concept:
        adverse_event["severity"] = severity_concept

    status = _enum_value(_get_value(incident, "status"))
    outcome_concept = _codeable_concept("urn:eovr:incident-status", status)
    if outcome_concept:
        adverse_event["outcome"] = outcome_concept

    location = _get_value(incident, "occurrence_location")
    if location:
        adverse_event["location"] = {"display": location}

    reporter_role = _get_value(incident, "reporter_role")
    if reporter_role:
        adverse_event["recorder"] = {"display": reporter_role}

    notes = [
        _annotation("Description", _get_value(incident, "description")),
        _annotation("Specific error", _get_value(incident, "specific_error")),
        _annotation("Notes", _get_value(incident, "notes")),
        _annotation("Recommendations", _get_value(incident, "recommendations")),
        _annotation("Corrective action", _get_value(incident, "corrective_action")),
        _annotation("Preventive action", _get_value(incident, "preventive_action")),
        _annotation("Final report", _get_value(incident, "final_report")),
    ]
    notes = [note for note in notes if note]
    if notes:
        adverse_event["note"] = notes

    facility_name = _get_value(incident, "facility_name")
    if facility_name:
        adverse_event["supportingInfo"] = [{"display": facility_name}]

    return adverse_event


def build_adverse_event_bundle(incidents: Iterable[IncidentInDB]) -> dict:
    """Wrap translated incidents into a FHIR R4 searchset Bundle."""
    incident_list = list(incidents)
    entries = [{"resource": build_adverse_event(incident)} for incident in incident_list]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }
