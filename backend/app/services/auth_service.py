"""backend/app/services/auth_service.py — Business logic for authentication, JWT issuance, and password hashing in E·OVR."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from app.db.database import get_database
from app.models.user import UserInDB

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not JWT_SECRET_KEY:
    raise EnvironmentError("JWT_SECRET_KEY environment variable is required for token operations.")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30
MAX_STORED_REFRESH_TOKENS = 10

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def _unauthorized_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def hash_password(plain: str) -> str:
    """Hash a plain-text password (or token) using bcrypt."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain value against its bcrypt hash."""
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_access_token(data: dict[str, Any]) -> str:
    """Create a 15-minute JWT access token containing user scope claims."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "user_id": data.get("user_id"),
        "role": data.get("role"),
        "facility": data.get("facility"),
        "administration": data.get("administration"),
        "governorate": data.get("governorate"),
        "tier": data.get("tier"),
        "token_type": "access",
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a 30-day JWT refresh token for the given user."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "user_id": user_id,
        "token_type": "refresh",
        "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token, raising 401 on invalid/expired tokens."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise _unauthorized_exception() from exc


async def authenticate_user(email: str, password: str, db: AsyncIOMotorDatabase) -> UserInDB | None:
    """Authenticate a user by email/password and update last_login on success."""
    user_doc = await db["users"].find_one({"email": email})
    if not user_doc:
        return None

    hashed_password = user_doc.get("hashed_password", "")
    if not hashed_password or not verify_password(password, hashed_password):
        return None

    now = datetime.now(tz=timezone.utc)
    await db["users"].update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": now}})

    user_doc["last_login"] = now
    user_doc.pop("_id", None)
    user_doc.setdefault("password", "")
    return UserInDB(**user_doc)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    """FastAPI dependency that returns validated JWT claims for the current user."""
    claims = decode_token(token)

    if claims.get("token_type") != "access":
        raise _unauthorized_exception()

    user_id = claims.get("user_id")
    if not user_id:
        raise _unauthorized_exception()

    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 1, "is_active": 1})
    if not user_doc or not user_doc.get("is_active", False):
        raise _unauthorized_exception()

    return claims


async def store_refresh_token(user_id: str, refresh_token: str, db: AsyncIOMotorDatabase) -> None:
    """Store a hashed refresh token in the user's refresh_tokens array."""
    hashed_token = hash_password(refresh_token)
    await db["users"].update_one(
        {"user_id": user_id},
        {"$push": {"refresh_tokens": {"$each": [hashed_token], "$slice": -MAX_STORED_REFRESH_TOKENS}}},
    )


async def verify_refresh_token(user_id: str, refresh_token: str, db: AsyncIOMotorDatabase) -> bool:
    """Return True if the provided refresh token matches any stored hashed token."""
    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 0, "refresh_tokens": 1})
    if not user_doc:
        return False

    stored_tokens = user_doc.get("refresh_tokens", [])
    for stored in stored_tokens:
        if verify_password(refresh_token, stored):
            return True
    return False


async def invalidate_refresh_token(user_id: str, refresh_token: str, db: AsyncIOMotorDatabase) -> bool:
    """Invalidate a refresh token by removing its matching hashed entry from storage."""
    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 0, "refresh_tokens": 1})
    if not user_doc:
        return False

    stored_tokens = user_doc.get("refresh_tokens", [])
    remaining_tokens: list[str] = []
    match_found = False
    for index, stored in enumerate(stored_tokens):
        if not match_found and verify_password(refresh_token, stored):
            match_found = True
            remaining_tokens.extend(stored_tokens[index + 1 :])
            break
        remaining_tokens.append(stored)

    if not match_found:
        return False

    await db["users"].update_one(
        {"user_id": user_id},
        {"$set": {"refresh_tokens": remaining_tokens}},
    )
    return True
