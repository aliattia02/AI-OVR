from typing import Optional, List

# ── Severity mapping ────────────────────────────────────────────────────
_SEVERITY_MAP = {
    "Major": {
        "system": "http://terminology.hl7.org/CodeSystem/adverse-event-severity",
        "code": "severe",
        "display": "Severe",
    },
    "Moderate": {
        "system": "http://terminology.hl7.org/CodeSystem/adverse-event-severity",
        "code": "moderate",
        "display": "Moderate",
    },
    "Minor": {
        "system": "http://terminology.hl7.org/CodeSystem/adverse-event-severity",
        "code": "mild",
        "display": "Mild",
    },
}

# ── Event type → FHIR actuality mapping ────────────────────────────────
_ACTUALITY_MAP = {
    "NearMiss": "potential",
    "IncidentEvent": "actual",
    "AdverseEvent": "actual",
    "SentinelEvent": "actual",
    "SignificantEvent": "actual",
}
# Default to "actual" for any unmapped value.


def map_incident_to_fhir_adverse_event(incident: dict) -> dict:
    """Map an eOVR incident MongoDB document to a FHIR R4 AdverseEvent resource dict.
    Returns the resource as a plain Python dict (caller serializes to JSON).
    Does not raise — missing optional fields are omitted from the output."""

    resource = {
        "resourceType": "AdverseEvent",
        "id": incident.get("incident_id", ""),
        "status": "completed" if incident.get("status") == "Completed" else "in-progress",
        "actuality": _ACTUALITY_MAP.get(incident.get("event_type", ""), "actual"),
        "recorded": str(incident.get("registration_date", "")),
    }

    # date
    if incident.get("occurrence_date"):
        resource["date"] = str(incident["occurrence_date"])

    # description
    if incident.get("description"):
        resource["description"] = incident["description"]

    # severity
    severity_raw = incident.get("severity", "")
    if severity_raw in _SEVERITY_MAP:
        resource["severity"] = {
            "coding": [_SEVERITY_MAP[severity_raw]],
            "text": severity_raw,
        }

    # subject (patient reference by MRN — reference only, no PHI exposed)
    if incident.get("medical_file_number"):
        resource["subject"] = {
            "type": "Patient",
            "identifier": {
                "system": "http://eovr.elbalto.com/mrn",
                "value": incident["medical_file_number"],
            },
        }

    # location
    if incident.get("occurrence_location"):
        resource["location"] = {"display": incident["occurrence_location"]}

    # JCI 8th Ed fields
    if incident.get("workplace_violence"):
        resource.setdefault("extension", []).append(
            {
                "url": "http://eovr.elbalto.com/fhir/StructureDefinition/workplace-violence",
                "valueBoolean": True,
            }
        )
    if incident.get("vulnerable_patient"):
        resource.setdefault("extension", []).append(
            {
                "url": "http://eovr.elbalto.com/fhir/StructureDefinition/vulnerable-patient",
                "valueString": incident.get("vulnerable_population_type", "unspecified"),
            }
        )

    return resource
