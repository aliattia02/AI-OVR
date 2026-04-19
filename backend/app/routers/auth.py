"""backend/app/routers/auth.py — API routes for user authentication (login, logout, token refresh) in E·OVR."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, constr

from app.db.database import get_database
from app.models.user import UserResponse
from app.services import auth_service
from app.utils.enums import UserRole

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_MAX_AGE_SECONDS = auth_service.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


class LoginRequest(BaseModel):
    """Payload for email/password login."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Bearer token plus authenticated user profile."""

    access_token: str
    token_type: str
    must_change_password: bool
    user: UserResponse


class AccessTokenResponse(BaseModel):
    """Access-token-only response payload."""

    access_token: str


class MessageResponse(BaseModel):
    """Generic message response payload."""

    message: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: constr(min_length=8)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _is_production() -> bool:
    app_env = (os.getenv("ENVIRONMENT") or "").strip().lower()
    return app_env == "production"


def _claims_from_user_doc(user_doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "user_id": user_doc.get("user_id"),
        "role": user_doc.get("role"),
        "facility": user_doc.get("facility_name"),
        "administration": user_doc.get("administration"),
        "governorate": user_doc.get("governorate"),
        "tier": user_doc.get("tier"),
    }


def _to_user_response(user_doc: dict[str, Any]) -> UserResponse:
    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        role=UserRole(user_doc["role"]),
        facility_name=user_doc["facility_name"],
        administration=user_doc["administration"],
        governorate=user_doc["governorate"],
        tier=user_doc["tier"],
        is_active=user_doc.get("is_active", True),
    )


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=_is_production(),
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=_is_production(),
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> LoginResponse:
    user = await auth_service.authenticate_user(payload.email, payload.password, db)
    if user is None:
        raise _unauthorized()

    access_token = auth_service.create_access_token(user.model_dump())
    refresh_token = auth_service.create_refresh_token(user.user_id)
    await auth_service.store_refresh_token(user.user_id, refresh_token, db)
    _set_refresh_cookie(response, refresh_token)

    user_response = UserResponse(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        facility_name=user.facility_name,
        administration=user.administration,
        governorate=user.governorate,
        tier=user.tier,
        is_active=user.is_active,
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=bool(user.model_dump().get("must_change_password", False)),
        user=user_response,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_access_token(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AccessTokenResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise _unauthorized()

    claims = auth_service.decode_token(refresh_token)
    if claims.get("token_type") != "refresh":
        raise _unauthorized()

    user_id = claims.get("user_id")
    if not user_id or not await auth_service.verify_refresh_token(user_id, refresh_token, db):
        raise _unauthorized()

    user_doc = await db["users"].find_one({"user_id": user_id, "is_active": True})
    if not user_doc:
        raise _unauthorized()

    access_token = auth_service.create_access_token(_claims_from_user_doc(user_doc))
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            claims = auth_service.decode_token(refresh_token)
            user_id = claims.get("user_id")
            if user_id:
                await auth_service.invalidate_refresh_token(user_id, refresh_token, db)
        except HTTPException:
            pass

    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
async def me(
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    user_id = claims.get("user_id")
    user_doc = await db["users"].find_one({"user_id": user_id, "is_active": True}, {"_id": 0, "hashed_password": 0})
    if not user_doc:
        raise _unauthorized()
    return _to_user_response(user_doc)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, str]:
    current_user_doc = await db["users"].find_one({"user_id": current_user.get("user_id")}, {"_id": 1})
    if not current_user_doc:
        raise _unauthorized()
    return await auth_service.change_password(
        db,
        current_user_doc["_id"],
        body.old_password,
        body.new_password,
    )
