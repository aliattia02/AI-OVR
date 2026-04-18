"""backend/app/routers/users.py — API routes for user management (create, update, roles) in E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
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

    doc = payload.model_dump()
    doc["user_id"] = user_id
    doc["hashed_password"] = auth_service.hash_password(payload.password)
    doc["is_active"] = True
    doc["created_at"] = now
    doc["last_login"] = None

    try:
        await db["users"].insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists") from exc

    return UserResponse(
        user_id=user_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        facility_name=payload.facility_name,
        administration=payload.administration,
        governorate=payload.governorate,
        tier=payload.tier,
        is_active=True,
    )


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
