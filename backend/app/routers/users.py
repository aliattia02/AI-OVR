"""backend/app/routers/users.py — API routes for user management (create, update, roles) in E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr
from pymongo.errors import DuplicateKeyError

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.user import UserCreate, UserResponse
from app.services import auth_service
from app.utils.enums import UserRole

router = APIRouter(prefix="/users", tags=["users"])


class MessageResponse(BaseModel):
    """Generic response message payload."""

    message: str


class ProvisionedCredential(BaseModel):
    user_id: str
    email: EmailStr
    role: UserRole
    temporary_password: str
    must_change_password: bool = True


class FacilityProvisionRequest(BaseModel):
    facility_name: str
    staff_email: EmailStr
    staff_full_name: str = "Facility Reporter"
    quality_admin_email: EmailStr
    quality_admin_full_name: str = "Facility Quality Admin"


class FacilityProvisionResponse(BaseModel):
    facility_name: str
    patient_link_uuid: str
    staff_reporter: ProvisionedCredential
    quality_admin: ProvisionedCredential


class TierProvisionRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    facility_name: str = ""
    administration: str = ""
    governorate: str = ""


_TIER_BY_ROLE: dict[UserRole, int] = {
    UserRole.staff: 2,
    UserRole.quality_admin: 2,
    UserRole.administration_manager: 3,
    UserRole.governorate_manager: 4,
    UserRole.top_management: 5,
}

_PROVISIONABLE_TIER_ROLES = {
    UserRole.administration_manager,
    UserRole.governorate_manager,
    UserRole.top_management,
}


def _make_user_doc(
    *,
    email: str,
    full_name: str,
    role: UserRole,
    facility_name: str,
    administration: str,
    governorate: str,
    temporary_password: str,
) -> dict[str, Any]:
    return {
        "user_id": f"USR-{uuid4().hex[:12].upper()}",
        "email": email,
        "full_name": full_name,
        "role": role.value,
        "facility_name": facility_name,
        "administration": administration,
        "governorate": governorate,
        "tier": _TIER_BY_ROLE[role],
        "hashed_password": auth_service.hash_password(temporary_password),
        "is_active": True,
        "must_change_password": True,
        "created_at": datetime.now(tz=timezone.utc),
        "last_login": None,
    }


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


@router.post("/provision/facility", response_model=FacilityProvisionResponse, status_code=status.HTTP_201_CREATED)
async def provision_facility_users(
    payload: FacilityProvisionRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FacilityProvisionResponse:
    _ = claims
    facility_doc = await db["facilities"].find_one(
        {"facility_name": payload.facility_name},
        {"_id": 0, "facility_name": 1, "administration": 1, "governorate": 1, "patient_link_uuid": 1},
    )
    if not facility_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")
    if not facility_doc.get("patient_link_uuid"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Facility has no patient link UUID")

    administration = str(facility_doc.get("administration", ""))
    governorate = str(facility_doc.get("governorate", ""))
    facility_name = str(facility_doc.get("facility_name", payload.facility_name))

    staff_temp_password = auth_service.generate_temp_password()
    qa_temp_password = auth_service.generate_temp_password()

    staff_doc = _make_user_doc(
        email=str(payload.staff_email),
        full_name=payload.staff_full_name,
        role=UserRole.staff,
        facility_name=facility_name,
        administration=administration,
        governorate=governorate,
        temporary_password=staff_temp_password,
    )
    qa_doc = _make_user_doc(
        email=str(payload.quality_admin_email),
        full_name=payload.quality_admin_full_name,
        role=UserRole.quality_admin,
        facility_name=facility_name,
        administration=administration,
        governorate=governorate,
        temporary_password=qa_temp_password,
    )

    try:
        await db["users"].insert_many([staff_doc, qa_doc], ordered=True)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="One or more user emails already exist") from exc

    return FacilityProvisionResponse(
        facility_name=facility_name,
        patient_link_uuid=str(facility_doc["patient_link_uuid"]),
        staff_reporter=ProvisionedCredential(
            user_id=staff_doc["user_id"],
            email=staff_doc["email"],
            role=UserRole.staff,
            temporary_password=staff_temp_password,
            must_change_password=True,
        ),
        quality_admin=ProvisionedCredential(
            user_id=qa_doc["user_id"],
            email=qa_doc["email"],
            role=UserRole.quality_admin,
            temporary_password=qa_temp_password,
            must_change_password=True,
        ),
    )


@router.post("/provision/tier", response_model=ProvisionedCredential, status_code=status.HTTP_201_CREATED)
async def provision_tier_user(
    payload: TierProvisionRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> ProvisionedCredential:
    _ = claims
    if payload.role not in _PROVISIONABLE_TIER_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be administration_manager, governorate_manager, or top_management")

    if payload.role == UserRole.administration_manager and not payload.administration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="administration is required for administration_manager")
    if payload.role == UserRole.governorate_manager and not payload.governorate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="governorate is required for governorate_manager")

    temp_password = auth_service.generate_temp_password()
    user_doc = _make_user_doc(
        email=str(payload.email),
        full_name=payload.full_name,
        role=payload.role,
        facility_name=payload.facility_name or "",
        administration=payload.administration or "",
        governorate=payload.governorate or "",
        temporary_password=temp_password,
    )
    try:
        await db["users"].insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists") from exc

    return ProvisionedCredential(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        role=payload.role,
        temporary_password=temp_password,
        must_change_password=True,
    )
