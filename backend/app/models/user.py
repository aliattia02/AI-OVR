"""backend/app/models/user.py — Pydantic and ODM models defining the User document schema (roles, credentials) for E·OVR."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, model_validator

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


class UserResponse(UserBase):
    """User document serialised for API responses (no credentials)."""

    user_id: str
    is_active: bool
