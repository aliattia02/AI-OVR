"""backend/app/routers/users.py — API routes for user management (create, update, roles) in E·OVR."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
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


@router.post("/provision/facility/{facility_id}", response_model=FacilityProvisionResult)
async def provision_facility_users(
    facility_id: str,
    current_user: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FacilityProvisionResult:
    actor_doc = await db["users"].find_one({"user_id": current_user.get("user_id")}, {"_id": 1})
    if not actor_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    current_user["_id"] = actor_doc["_id"]

    facility = await db["facilities"].find_one({"_id": facility_id})
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    results: dict[str, dict[str, str]] = {}
    for suffix, role_enum in [("staff", UserRole.staff), ("quality_admin", UserRole.quality_admin)]:
        username = f"{facility_id[:8]}_{suffix}"
        existing_user = await db["users"].find_one({"username": username})
        if existing_user:
            results[suffix] = {
                "username": username,
                "temp_password": "(already set — use reset if needed)",
                "user_id": str(existing_user.get("user_id") or existing_user.get("_id")),
            }
            continue

        temp_pw = generate_temp_password()
        user_id = str(uuid.uuid4())
        await db["users"].insert_one(
            {
                "_id": user_id,
                "username": username,
                "full_name": f"{facility['facility_name']} — {suffix}",
                "hashed_password": hash_password(temp_pw),
                "role": role_enum.value,
                "tier": "facility",
                "facility_id": facility_id,
                "governorate": facility["governorate"],
                "administration": facility["administration"],
                "is_active": True,
                "must_change_password": True,
                "created_by": str(current_user["_id"]),
            }
        )
        results[suffix] = {"username": username, "temp_password": temp_pw, "user_id": user_id}

    return FacilityProvisionResult(
        facility_id=facility_id,
        patient_link_uuid=str(facility["patient_link_uuid"]),
        staff_reporter=results["staff"],
        quality_admin=results["quality_admin"],
        note="Temp passwords shown ONCE. Users must change password on first login.",
    )


@router.post("/provision/tier", response_model=TierUserResult)
async def provision_tier_user(
    body: TierUserRequest,
    current_user: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TierUserResult:
    if body.role in {UserRole.staff, UserRole.quality_admin}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /users/provision/facility/{facility_id} for facility-level roles",
        )

    existing_user = await db["users"].find_one({"username": body.username})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    actor_doc = await db["users"].find_one({"user_id": current_user.get("user_id")}, {"_id": 1})
    if not actor_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    current_user["_id"] = actor_doc["_id"]

    tier_map = {
        UserRole.governorate_manager: "governorate",
        UserRole.administration_manager: "administration",
        UserRole.top_management: "national",
    }
    tier = tier_map[body.role]
    temp_pw = generate_temp_password()
    await db["users"].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "username": body.username,
            "full_name": body.full_name,
            "email": body.email,
            "hashed_password": hash_password(temp_pw),
            "role": body.role.value,
            "tier": tier,
            "governorate": body.governorate,
            "administration": body.administration,
            "facility_id": None,
            "is_active": True,
            "must_change_password": True,
            "created_by": str(current_user["_id"]),
        }
    )

    return TierUserResult(
        username=body.username,
        role=body.role.value,
        temp_password=temp_pw,
        must_change_password=True,
    )
