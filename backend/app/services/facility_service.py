"""backend/app/services/facility_service.py — Business logic for facility management and multi-tenancy scoping in E·OVR."""

from __future__ import annotations

from typing import Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.facility import FacilityInDB, FacilityResponse
from app.utils.enums import UserRole


def _coerce_facility_doc(doc: dict) -> dict:
    """Convert MongoDB `_id` to string so it is compatible with Pydantic models."""
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out


async def get_facilities(db: AsyncIOMotorDatabase) -> List[FacilityResponse]:
    """Return all facilities sorted by governorate, administration, and facility name."""
    cursor = db["facilities"].find(
        {},
        {
            "_id": 0,
            "governorate": 1,
            "administration": 1,
            "facility_name": 1,
            "facility_type": 1,
            "patient_link_uuid": 1,
            "created_at": 1,
        },
    ).sort(
        [
            ("governorate", 1),
            ("administration", 1),
            ("facility_name", 1),
        ]
    )
    docs = await cursor.to_list(length=None)
    return [FacilityResponse(**doc) for doc in docs]


async def get_cascading_options(db: AsyncIOMotorDatabase) -> dict:
    """Return precomputed nested dropdown data for governorate/administration/facility."""
    docs = await db["facilities"].find(
        {},
        {"_id": 0, "governorate": 1, "administration": 1, "facility_name": 1},
    ).to_list(length=None)

    governorates: set[str] = set()
    administrations_map: Dict[str, set[str]] = {}
    facilities_map: Dict[str, set[str]] = {}

    for doc in docs:
        governorate = doc.get("governorate")
        administration = doc.get("administration")
        facility_name = doc.get("facility_name")
        if not governorate or not administration or not facility_name:
            continue

        governorates.add(governorate)
        administrations_map.setdefault(governorate, set()).add(administration)
        facilities_map.setdefault(administration, set()).add(facility_name)

    return {
        "governorates": sorted(governorates),
        "administrations": {gov: sorted(admins) for gov, admins in administrations_map.items()},
        "facilities": {admin: sorted(facilities) for admin, facilities in facilities_map.items()},
    }


async def get_facility_by_patient_uuid(uuid: str, db: AsyncIOMotorDatabase) -> FacilityInDB | None:
    """Return a facility document by patient_link_uuid, or None if not found."""
    doc = await db["facilities"].find_one({"patient_link_uuid": uuid})
    if doc is None:
        return None
    return FacilityInDB(**_coerce_facility_doc(doc))


async def get_quality_admin_email(facility_name: str, db: AsyncIOMotorDatabase) -> str | None:
    """Return the quality admin's email for the provided facility name, if available."""
    user_doc = await db["users"].find_one(
        {"facility_name": facility_name, "role": UserRole.quality_admin.value},
        {"_id": 0, "email": 1},
    )
    if not user_doc:
        return None

    email = user_doc.get("email")
    return email if isinstance(email, str) and len(email) > 0 else None
