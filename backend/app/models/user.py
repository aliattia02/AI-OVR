"""backend/app/models/user.py — Pydantic and ODM models defining the User document schema (roles, credentials) for E·OVR."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.utils.enums import UserRole


class UserBase(BaseModel):
    """Shared user identity fields (no credentials)."""

    email: EmailStr
    full_name: str
    role: UserRole
    facility_name: str
    administration: str
    governorate: str
    tier: int                     # 1–5


class UserCreate(UserBase):
    """Fields supplied when registering a new user account."""

    password: str                 # plain-text; hashed before persistence
    must_change_password: bool = True

    @model_validator(mode="after")
    def enforce_must_change_password(self) -> UserCreate:
        """Force must_change_password=True for provisioning payloads.

        The class check keeps this enforcement scoped to creation payloads only,
        so DB-backed models can represent users after they have changed passwords.
        """
        if type(self) is UserCreate:
            self.must_change_password = True
        return self


class UserInDB(UserBase):
    """Full user document as stored in the database.

    Carries ``hashed_password`` only; plain-text password is never persisted.
    """

    user_id: str
    hashed_password: str
    must_change_password: bool = True
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    mfa_enrolled_at: Optional[datetime] = None
    # Stored refresh token entries: {jti, token_hash, created_at}
    refresh_tokens: list[dict[str, Any]] = Field(default_factory=list)


class UserResponse(BaseModel):
    """User document serialised for API responses (no credentials).

    Intentionally does NOT inherit UserBase so that nullable fields on
    provisioned / higher-tier accounts (email, facility_name, administration,
    governorate) are expressed as Optional here without weakening the strict
    creation-time validation in UserBase / UserCreate.

    Background: quality_admin and staff_reporter accounts are provisioned
    without an email address (stored as null in MongoDB).  Governorate /
    administration managers have no facility_name.  Top-management accounts
    have neither facility_name nor administration.  Using non-Optional EmailStr
    or str for these fields caused a Pydantic ValidationError (→ FastAPI 500)
    in both the login endpoint and any list_users query.
    """

    user_id: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    facility_name: Optional[str] = None
    administration: Optional[str] = None
    governorate: Optional[str] = None
    tier: int
    is_active: bool