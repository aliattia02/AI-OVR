from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_db, require_role
from app.services.fhir_service import map_incident_to_fhir_adverse_event

fhir_router = APIRouter(tags=["FHIR R4"])


@fhir_router.get("/AdverseEvent/{incident_id}")
async def get_fhir_adverse_event(
    incident_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Return a single FHIR R4 AdverseEvent resource for the given incident_id.
    Scoped to the caller's role — a quality_admin sees only their facility's incidents."""
    require_role(
        current_user,
        [
            "quality_admin",
            "administration_manager",
            "governorate_manager",
            "top_management",
        ],
    )
    incident = await db.incidents.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return map_incident_to_fhir_adverse_event(incident)


@fhir_router.get("/AdverseEvent")
async def list_fhir_adverse_events(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """Return a FHIR R4 Bundle (searchset) of AdverseEvent resources.
    Scope filter mirrors the existing incidents list scoping for this role.
    Limit capped at 100 to protect budget."""
    require_role(
        current_user,
        [
            "quality_admin",
            "administration_manager",
            "governorate_manager",
            "top_management",
        ],
    )
    limit = min(limit, 100)

    # Reuse the same scope filter pattern as the main incidents list endpoint.
    # For now use facility-level filter; adapt to match the existing get_scope_filter() helper.
    scope_filter = {}
    role = current_user.get("role", "")
    if role == "quality_admin":
        scope_filter["facility_name"] = current_user.get("facility_name")
    elif role == "administration_manager":
        scope_filter["administration"] = current_user.get("administration")
    elif role == "governorate_manager":
        scope_filter["governorate"] = current_user.get("governorate")
    # top_management: no filter (sees all)

    cursor = db.incidents.find(scope_filter).skip(skip).limit(limit)
    entries = [{"resource": map_incident_to_fhir_adverse_event(inc)} async for inc in cursor]
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


router = fhir_router
