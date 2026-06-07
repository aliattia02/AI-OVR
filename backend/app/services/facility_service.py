"""backend/app/services/facility_service.py — Business logic for facility management and multi-tenancy scoping in E·OVR."""

from __future__ import annotations

from typing import Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.facility import FacilityInDB, FacilityResponse, FacilitySafeResponse
from app.utils.enums import UserRole


def _coerce_facility_doc(doc: dict) -> dict:
    """Convert MongoDB `_id` to string so it is compatible with Pydantic models."""
    out = dict(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out


async def get_facilities(db: AsyncIOMotorDatabase) -> List[FacilityResponse]:
    """Return all facilities sorted by governorate, administration, and facility name.
    Top-management only — includes patient_link_uuid and EN fields.
    """
    cursor = db["facilities"].find(
        {},
        {
            "_id": 1,
            "governorate": 1,
            "administration": 1,
            "facility_name": 1,
            "facility_type": 1,
            "facility_type_en": 1,
            "administration_en": 1,
            "facility_name_en": 1,
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
    return [
        FacilityResponse(
            facility_id=str(doc["_id"]),
            **{k: v for k, v in doc.items() if k != "_id"},
        )
        for doc in docs
    ]


async def get_facilities_safe(db: AsyncIOMotorDatabase) -> list[FacilitySafeResponse]:
    """Return all facilities WITHOUT patient_link_uuid or _id.

    Used by the public GET /facilities/ endpoint so anonymous users and
    dropdown consumers cannot harvest submission UUIDs.
    Includes EN fields for bilingual frontend display.
    """
    cursor = db["facilities"].find(
        {},
        {"patient_link_uuid": 0, "_id": 0},
    ).sort([
        ("governorate", 1),
        ("administration", 1),
        ("facility_name", 1),
    ])
    docs = await cursor.to_list(length=None)
    return [FacilitySafeResponse(**doc) for doc in docs]


async def get_cascading_options(db: AsyncIOMotorDatabase) -> dict:
    """Return precomputed nested dropdown data for governorate/administration/facility.

    EN fields are included alongside Arabic so the frontend can display
    English labels while still submitting the canonical Arabic values.

    Response shape:
    {
        "governorates": ["Aswan", ...],
        "administrations": {
            "Aswan": ["إدارة اسوان", ...]
        },
        "administrations_en": {
            "Aswan": {"إدارة اسوان": "Aswan Administration", ...}
        },
        "facilities": {
            "إدارة اسوان": ["مستشفى اسوان التخصصي", ...]
        },
        "facilities_en": {
            "إدارة اسوان": {
                "مستشفى اسوان التخصصي": "Aswan Specialized Hospital",
                ...
            }
        },
        "facility_types": ["مركز", "مستشفى", "وحدة"],
        "facility_types_en": {"مركز": "Health Center", "مستشفى": "Hospital", "وحدة": "Health Unit"}
    }
    """
    docs = await db["facilities"].find(
        {},
        {
            "_id": 0,
            "governorate": 1,
            "administration": 1,
            "administration_en": 1,
            "facility_name": 1,
            "facility_name_en": 1,
            "facility_type": 1,
            "facility_type_en": 1,
        },
    ).to_list(length=None)

    governorates: set[str] = set()
    administrations_map: Dict[str, set[str]] = {}
    administrations_en_map: Dict[str, Dict[str, str]] = {}   # gov -> {ar_admin: en_admin}
    facilities_map: Dict[str, set[str]] = {}
    facilities_en_map: Dict[str, Dict[str, str]] = {}        # ar_admin -> {ar_name: en_name}
    facility_types: set[str] = set()
    facility_types_en: Dict[str, str] = {}

    for doc in docs:
        governorate      = doc.get("governorate")
        administration   = doc.get("administration")
        administration_en = doc.get("administration_en") or ""
        facility_name    = doc.get("facility_name")
        facility_name_en = doc.get("facility_name_en") or ""
        facility_type    = doc.get("facility_type")
        facility_type_en = doc.get("facility_type_en") or ""

        if not governorate or not administration or not facility_name:
            continue

        governorates.add(governorate)

        administrations_map.setdefault(governorate, set()).add(administration)
        if administration_en:
            administrations_en_map.setdefault(governorate, {})[administration] = administration_en

        facilities_map.setdefault(administration, set()).add(facility_name)
        if facility_name_en:
            facilities_en_map.setdefault(administration, {})[facility_name] = facility_name_en

        if facility_type:
            facility_types.add(facility_type)
            if facility_type_en:
                facility_types_en[facility_type] = facility_type_en

    return {
        "governorates": sorted(governorates),
        "administrations": {
            gov: sorted(admins)
            for gov, admins in administrations_map.items()
        },
        "administrations_en": administrations_en_map,
        "facilities": {
            admin: sorted(facilities)
            for admin, facilities in facilities_map.items()
        },
        "facilities_en": facilities_en_map,
        "facility_types": sorted(facility_types),
        "facility_types_en": facility_types_en,
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