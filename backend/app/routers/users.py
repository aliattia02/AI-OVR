"""backend/app/routers/users.py — API routes for user management (create, update, roles) in E·OVR."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.user import UserCreate, UserResponse
from app.services import auth_service
from app.services.auth_service import generate_temp_password, hash_password
from app.utils.enums import UserRole

router = APIRouter(prefix="/users", tags=["users"])


class MessageResponse(BaseModel):
    """Generic response message payload."""

    message: str


class FacilityProvisionResult(BaseModel):
    facility_id: str
    patient_link_uuid: str
    staff_reporter: dict
    quality_admin: dict
    note: str


class TierUserRequest(BaseModel):
    username: str
    full_name: str
    role: UserRole
    governorate: Optional[str] = None
    administration: Optional[str] = None
    email: Optional[str] = None


class TierUserResult(BaseModel):
    username: str
    role: str
    temp_password: str
    must_change_password: bool


@router.get("/", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[UserResponse]:
    _ = claims
    cursor = (
        db["users"]
        .find({}, {"_id": 0, "hashed_password": 0, "password": 0, "refresh_tokens": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return [UserResponse.model_validate(doc) for doc in docs]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    _ = claims
    user_id = f"USR-{uuid4().hex[:12].upper()}"
    now = datetime.now(tz=timezone.utc)

    doc = payload.model_dump(exclude={"password"})
    doc["user_id"] = user_id
    doc["hashed_password"] = auth_service.hash_password(payload.password)
    doc["is_active"] = True
    doc["created_at"] = now
    doc["last_login"] = None

    try:
        await db["users"].insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists") from exc

    return UserResponse.model_validate(doc)


@router.patch("/{user_id}/deactivate", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    _ = claims
    result = await db["users"].update_one({"user_id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return MessageResponse(message="User deactivated")


@router.post(
    "/provision/facility/{facility_id}",
    response_model=FacilityProvisionResult,
    dependencies=[Depends(require_role(UserRole.top_management))],
)
async def provision_facility_users(
    facility_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user=Depends(auth_service.get_current_user),
) -> FacilityProvisionResult:
    """Create facility staff and quality admin accounts and return patient UUID credential."""
    facility_query: dict[str, Any] = {"_id": facility_id}
    if ObjectId.is_valid(facility_id):
        facility_query = {"_id": ObjectId(facility_id)}

    facility = await db["facilities"].find_one(facility_query)
    if not facility:
        facility = await db["facilities"].find_one({"facility_name": facility_id})
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    facility_name = str(facility.get("facility_name", facility_id))
    normalized_facility_id = str(facility.get("_id", facility_id))
    created: dict[str, dict[str, str]] = {}
    for suffix, role in [("staff", UserRole.staff), ("quality_admin", UserRole.quality_admin)]:
        username = f"{normalized_facility_id[:8]}_{suffix}"
        existing = await db["users"].find_one({"username": username})
        if existing:
            created[suffix] = {
                "username": username,
                "temp_password": "(already set — use reset endpoint if needed)",
                "user_id": str(existing.get("_id", existing.get("user_id", ""))),
            }
            continue

        temp_pw = generate_temp_password()
        synthetic_email = f"{username}@provisioned.local"
        doc = {
            "_id": str(uuid.uuid4()),
            "user_id": f"USR-{uuid4().hex[:12].upper()}",
            "username": username,
            "email": synthetic_email,
            "full_name": f"{facility_name} — {role.value}",
            "hashed_password": hash_password(temp_pw),
            "role": role.value,
            "tier": 2,
            "facility_id": normalized_facility_id,
            "facility_name": facility_name,
            "governorate": facility.get("governorate"),
            "administration": facility.get("administration"),
            "is_active": True,
            "must_change_password": True,
            "created_by": str(current_user.get("user_id", "")),
            "created_at": datetime.now(tz=timezone.utc),
            "last_login": None,
        }
        await db["users"].insert_one(doc)
        created[suffix] = {"username": username, "temp_password": temp_pw, "user_id": doc["_id"]}

    return FacilityProvisionResult(
        facility_id=normalized_facility_id,
        patient_link_uuid=str(facility.get("patient_link_uuid", "")),
        staff_reporter=created["staff"],
        quality_admin=created["quality_admin"],
        note="Temp passwords are shown ONCE. Users must change password on first login.",
    )


@router.post(
    "/provision/tier",
    response_model=TierUserResult,
    dependencies=[Depends(require_role(UserRole.top_management))],
)
async def provision_tier_user(
    body: TierUserRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user=Depends(auth_service.get_current_user),
) -> TierUserResult:
    """Create a single governorate/administration/top-management account."""
    facility_roles = {UserRole.staff, UserRole.quality_admin}
    if body.role in facility_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /users/provision/facility/{id} for facility-level roles.",
        )
    if await db["users"].find_one({"username": body.username}):
        raise HTTPException(status_code=409, detail="Username already exists")

    tier_map = {
        UserRole.governorate_manager: 4,
        UserRole.administration_manager: 3,
        UserRole.top_management: 5,
    }
    temp_pw = generate_temp_password()
    email = body.email or f"{body.username}@provisioned.local"
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": f"USR-{uuid4().hex[:12].upper()}",
        "username": body.username,
        "full_name": body.full_name,
        "email": email,
        "hashed_password": hash_password(temp_pw),
        "role": body.role.value,
        "tier": tier_map.get(body.role, 5),
        "governorate": body.governorate,
        "administration": body.administration,
        "facility_id": None,
        "facility_name": "",
        "is_active": True,
        "must_change_password": True,
        "created_by": str(current_user.get("user_id", "")),
        "created_at": datetime.now(tz=timezone.utc),
        "last_login": None,
    }
    await db["users"].insert_one(doc)
    return TierUserResult(
        username=body.username,
        role=body.role.value,
        temp_password=temp_pw,
        must_change_password=True,
    )
