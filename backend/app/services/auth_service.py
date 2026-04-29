"""backend/app/services/auth_service.py — Business logic for authentication, JWT issuance, and password hashing in E·OVR."""

from __future__ import annotations

import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.exc import UnknownHashError
from passlib.context import CryptContext
import pyotp

from app.db.database import get_database
from app.models.user import UserInDB

load_dotenv()

# JWT_SECRET is the canonical name used in .env.example and the system design.
# JWT_SECRET_KEY is accepted as a fallback for backwards compatibility.
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY", "")
if not JWT_SECRET:
    raise EnvironmentError(
        "JWT_SECRET environment variable is required. "
        "Set it in your .env file (see .env.example)."
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Read expiry from env so staging/production can override without code changes.
# Defaults match the system design: 15 min access, 30 day refresh.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
MAX_STORED_REFRESH_TOKENS = 10
SECURE_RANDOM = secrets.SystemRandom()

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
    except (UnknownHashError, ValueError, TypeError):
        return False


def generate_temporary_password(length: int = 12) -> str:
    """Generate a temporary password with mixed-case letters and digits."""
    if length < 8:
        raise ValueError("Temporary password length must be at least 8 characters")

    required_chars = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
    ]
    charset = string.ascii_letters + string.digits
    remaining = [secrets.choice(charset) for _ in range(length - len(required_chars))]
    password_chars = required_chars + remaining
    SECURE_RANDOM.shuffle(password_chars)
    return "".join(password_chars)


def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password using uppercase, lowercase, digits, and symbols."""
    if length < 4:
        raise ValueError("Temporary password length must be at least 4 characters")

    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%"
    alphabet = uppercase + lowercase + digits + symbols

    password_chars = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(symbols),
    ]
    password_chars.extend(secrets.choice(alphabet) for _ in range(length - 4))
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


def build_login_response(access_token: str, user_doc: dict[str, Any]) -> dict[str, Any]:
    """Build login payload that includes token and password-change requirement."""
    return {
        "access_token": access_token,
        "must_change_password": user_doc.get("must_change_password", False),
    }


def create_access_token(data: dict[str, Any]) -> str:
    """Create a JWT access token containing user scope claims."""
    now = datetime.now(tz=timezone.utc)
    facility = data.get("facility") or data.get("facility_name")
    payload = {
        "user_id": data.get("user_id"),
        "role": data.get("role"),
        "facility": facility,
        "administration": data.get("administration"),
        "governorate": data.get("governorate"),
        "tier": data.get("tier"),
        "token_type": "access",
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a refresh token for the given user."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "user_id": user_id,
        "jti": str(uuid4()),
        "token_type": "refresh",
        "exp": now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token, raising 401 on invalid/expired tokens."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
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
    user_doc.pop("password", None)
    user_doc.pop("_id", None)
    return UserInDB.model_construct(**user_doc)


async def change_user_password(
    user_id: str,
    current_password: str,
    new_password: str,
    db: AsyncIOMotorDatabase,
) -> bool:
    """Change a user's password after validating the current password."""
    if not new_password:
        return False

    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 1, "hashed_password": 1})
    if not user_doc:
        return False

    stored_hash = user_doc.get("hashed_password")
    if not isinstance(stored_hash, str) or not verify_password(current_password, stored_hash):
        return False

    if verify_password(new_password, stored_hash):
        return False

    result = await db["users"].update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "hashed_password": hash_password(new_password),
                "must_change_password": False,
            }
        },
    )
    return result.modified_count > 0


async def change_password(
    db: AsyncIOMotorDatabase,
    user_id: str,
    old_password: str,
    new_password: str,
) -> dict[str, str]:
    """Change password for a user and clear must_change_password on success."""
    user_doc = await db["users"].find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(old_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    new_hash = hash_password(new_password)
    await db["users"].update_one(
        {"_id": user_id},
        {"$set": {"hashed_password": new_hash, "must_change_password": False}},
    )
    return {"message": "Password changed successfully"}


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
    claims = decode_token(refresh_token)
    if claims.get("token_type") != "refresh" or claims.get("user_id") != user_id:
        raise _unauthorized_exception()

    hashed_token = hash_password(refresh_token)
    token_entry = {
        "jti": claims.get("jti"),
        "token_hash": hashed_token,
        "created_at": datetime.now(tz=timezone.utc),
    }
    await db["users"].update_one(
        {"user_id": user_id},
        {"$push": {"refresh_tokens": {"$each": [token_entry], "$slice": -MAX_STORED_REFRESH_TOKENS}}},
    )


async def verify_refresh_token(user_id: str, refresh_token: str, db: AsyncIOMotorDatabase) -> bool:
    """Return True if the provided refresh token matches any stored hashed token."""
    try:
        claims = decode_token(refresh_token)
    except HTTPException:
        return False
    if claims.get("token_type") != "refresh":
        return False

    token_jti = claims.get("jti")
    if token_jti:
        user_doc = await db["users"].find_one(
            {"user_id": user_id, "refresh_tokens.jti": token_jti},
            {"_id": 0, "refresh_tokens.$": 1},
        )
        if not user_doc:
            return False
        stored_tokens = user_doc.get("refresh_tokens", [])
        if not stored_tokens:
            return False
        token_entry = stored_tokens[0]
        if not isinstance(token_entry, dict):
            return False
        stored_hash = token_entry.get("token_hash")
        return isinstance(stored_hash, str) and verify_password(refresh_token, stored_hash)

    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 0, "refresh_tokens": 1})
    if not user_doc:
        return False
    for stored in user_doc.get("refresh_tokens", []):
        if not isinstance(stored, dict):
            continue
        stored_hash = stored.get("token_hash")
        if isinstance(stored_hash, str) and verify_password(refresh_token, stored_hash):
            return True
    return False


async def invalidate_refresh_token(user_id: str, refresh_token: str, db: AsyncIOMotorDatabase) -> bool:
    """Invalidate a refresh token by removing its matching hashed entry from storage."""
    try:
        claims = decode_token(refresh_token)
    except HTTPException:
        return False
    if claims.get("token_type") != "refresh":
        return False

    token_jti = claims.get("jti")
    if token_jti:
        user_doc = await db["users"].find_one(
            {"user_id": user_id, "refresh_tokens.jti": token_jti},
            {"_id": 0, "refresh_tokens.$": 1},
        )
        if not user_doc:
            return False
        stored_tokens = user_doc.get("refresh_tokens", [])
        if not stored_tokens:
            return False
        token_entry = stored_tokens[0]
        if not isinstance(token_entry, dict):
            return False
        stored_hash = token_entry.get("token_hash")
        if not isinstance(stored_hash, str) or not verify_password(refresh_token, stored_hash):
            return False
        result = await db["users"].update_one(
            {"user_id": user_id},
            {"$pull": {"refresh_tokens": {"jti": token_jti}}},
        )
        return result.modified_count > 0

    user_doc = await db["users"].find_one({"user_id": user_id}, {"_id": 0, "refresh_tokens": 1})
    if not user_doc:
        return False
    remaining: list[dict[str, Any]] = []
    match_found = False
    for stored in user_doc.get("refresh_tokens", []):
        if not isinstance(stored, dict):
            continue
        stored_hash = stored.get("token_hash")
        if isinstance(stored_hash, str) and verify_password(refresh_token, stored_hash):
            match_found = True
            continue
        remaining.append(stored)

    if not match_found:
        return False
    await db["users"].update_one(
        {"user_id": user_id},
        {"$set": {"refresh_tokens": remaining}},
    )
    return True


MFA_ISSUER = "eOVR"


def generate_mfa_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, username: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=MFA_ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
