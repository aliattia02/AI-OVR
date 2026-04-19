"""backend/app/routers/users.py — API routes for user management (create, update, roles) in E·OVR."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
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

EMAIL_DOMAIN = "uhic.ovr"


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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(value: str) -> str:
    """Strip characters that are unsafe in usernames/email local-parts.

    Keeps alphanumeric characters and underscores; replaces spaces and hyphens
    with underscores; removes everything else.
    """
    value = value.strip()
    value = re.sub(r"[\s\-]+", "_", value)
    value = re.sub(r"[^\w]", "", value)       # \w = [a-zA-Z0-9_]
    return value


async def _resolve_actor_id(db: AsyncIOMotorDatabase, current_user: dict[str, Any]) -> str:
    """Return a string representation of the acting user's DB identity.

    Tries three strategies in order so the endpoint works regardless of whether
    the logged-in top-management account was created via ``create_user``
    (has a ``user_id`` field) or via ``provision_tier_user`` (only has ``_id``):

    1. Look up by the ``user_id`` application field.
    2. Look up by ``_id`` directly (using the ``sub`` claim if present).
    3. Fall back to a stringified snapshot of the claims — keeps an audit trail
       even when the exact DB document cannot be resolved.
    """
    # Strategy 1: application-level user_id field (created via create_user)
    app_user_id = current_user.get("user_id")
    if app_user_id:
        doc = await db["users"].find_one({"user_id": app_user_id}, {"_id": 1})
        if doc:
            return str(doc["_id"])

    # Strategy 2: _id lookup via JWT sub / username claim
    for claim_key in ("sub", "username", "email"):
        claim_val = current_user.get(claim_key)
        if not claim_val:
            continue
        doc = await db["users"].find_one(
            {"$or": [{"_id": claim_val}, {"username": claim_val}, {"email": claim_val}]},
            {"_id": 1},
        )
        if doc:
            return str(doc["_id"])

    # Strategy 3: graceful fallback — never block the provision just for audit
    return f"claims:{current_user.get('sub') or current_user.get('username') or 'unknown'}"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[UserResponse])
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        ) from exc

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
    # Resolve actor — never raises; falls back gracefully so provision is never
    # blocked solely because of an audit-trail lookup failure.
    actor_id = await _resolve_actor_id(db, current_user)

    try:
        oid = ObjectId(facility_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid facility ID format",
        )

    facility = await db["facilities"].find_one({"_id": oid})
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    # Derive a clean slug from the English facility name.
    # Falls back to the first 8 characters of the facility_id if the field is absent.
    raw_name_en: str = facility.get("facility_name_en") or ""
    name_slug = _slugify(raw_name_en) if raw_name_en else facility_id[:8]

    now = datetime.now(tz=timezone.utc)

    # role_label is what appears in the email address and username
    role_configs = [
        ("staff",         "staff", UserRole.staff),
        ("quality_admin", "QC",    UserRole.quality_admin),
    ]

    results: dict[str, dict[str, str]] = {}
    for result_key, email_suffix, role_enum in role_configs:
        username = f"{name_slug}_{email_suffix}"
        email    = f"{username}@{EMAIL_DOMAIN}"

        existing_user = await db["users"].find_one({"username": username})
        if existing_user:
            results[result_key] = {
                "username": username,
                "email": email,
                "temp_password": "(already set — use reset if needed)",
                "user_id": str(existing_user.get("user_id") or existing_user.get("_id")),
            }
            continue

        temp_pw = generate_temp_password()
        new_user_id = str(uuid.uuid4())
        app_user_id = f"USR-{uuid4().hex[:12].upper()}"

        try:
            await db["users"].insert_one(
                {
                    "_id": new_user_id,
                    "user_id": app_user_id,   # required by auth.py login handler
                    "username": username,
                    "email": email,
                    "full_name": f"{facility['facility_name']} — {result_key.replace('_', ' ').title()}",
                    "hashed_password": hash_password(temp_pw),
                    "role": role_enum.value,
                    "tier": 2,                # matches frontend enums.js: staff/quality_admin = tier 2
                    "facility_id": facility_id,
                    "facility_name": facility["facility_name"],
                    "governorate": facility["governorate"],
                    "administration": facility["administration"],
                    "is_active": True,
                    "must_change_password": True,
                    "created_at": now,
                    "last_login": None,
                    "created_by": actor_id,
                }
            )
        except DuplicateKeyError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User '{username}' or email '{email}' already exists.",
            ) from exc

        results[result_key] = {
            "username": username,
            "email": email,
            "temp_password": temp_pw,
            "user_id": new_user_id,
        }

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

    actor_id = await _resolve_actor_id(db, current_user)

    tier_map = {
        UserRole.governorate_manager: "governorate",
        UserRole.administration_manager: "administration",
        UserRole.top_management: "national",
    }
    tier_int_map = {
        UserRole.governorate_manager: 3,
        UserRole.administration_manager: 2,
        UserRole.top_management: 4,
    }
    tier = tier_map[body.role]
    tier_int = tier_int_map[body.role]
    temp_pw = generate_temp_password()
    now = datetime.now(tz=timezone.utc)
    app_user_id = f"USR-{uuid4().hex[:12].upper()}"

    try:
        await db["users"].insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": app_user_id,       # required by auth.py login handler
                "username": body.username,
                "full_name": body.full_name,
                "email": body.email,
                "hashed_password": hash_password(temp_pw),
                "role": body.role.value,
                "tier": tier_int,             # UserInDB.tier is int
                "tier_label": tier,           # keep the human-readable label too
                "governorate": body.governorate,
                "administration": body.administration,
                "facility_id": None,
                "is_active": True,
                "must_change_password": True,
                "created_at": now,
                "last_login": None,
                "created_by": actor_id,
            }
        )
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        ) from exc

    return TierUserResult(
        username=body.username,
        role=body.role.value,
        temp_password=temp_pw,
        must_change_password=True,
    )