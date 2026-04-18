"""backend/app/models/user.py — Pydantic and ODM models defining the User document schema (roles, credentials) for E·OVR."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.utils.enums import UserRole


class UserCreate(BaseModel):
    """Fields supplied when registering a new user account."""

    email: EmailStr
    full_name: str
    password: str                 # plain-text; hashed before persistence
    role: UserRole
    facility_name: str
    administration: str
    governorate: str
    tier: int                     # 1–5


class UserInDB(UserCreate):
    """Full user document as stored in the database.

    Carries ``hashed_password`` in addition to the inherited plain ``password``
    field; the plain-text value must be discarded after hashing.
    """

    user_id: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None


class UserResponse(BaseModel):
    """User document serialised for API responses (no credentials)."""

    user_id: str
    email: EmailStr
    full_name: str
    role: UserRole
    facility_name: str
    administration: str
    governorate: str
    tier: int
    is_active: bool
