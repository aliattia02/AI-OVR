"""backend/app/middleware/auth_middleware.py — FastAPI dependencies for JWT auth and role-based access control in E·OVR."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.services import auth_service
from app.utils.enums import UserRole

optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


# ── User-provisioning allowlist ────────────────────────────────────────────
# Hardcoded set of usernames permitted to create or provision new user
# accounts. Checked case-insensitively against the "username" field on the
# caller's user document. This is intentionally separate from, and more
# restrictive than, the top_management ROLE check: a caller must be BOTH
# top_management AND listed here to create users.
#
# JWT claims only carry user_id (not username), so this dependency looks the
# username up in the DB on each call.
#
# To grant/revoke provisioning access, edit this set directly and redeploy.
USER_PROVISIONING_ALLOWLIST: frozenset[str] = frozenset({"admin", "test"})


def require_role(*allowed_roles: UserRole):
    """Require an authenticated user whose role is in the allowed role set."""

    async def _role_dependency(
        claims: dict[str, Any] = Depends(auth_service.get_current_user),
    ) -> dict[str, Any]:
        role = claims.get("role")
        allowed_values = {allowed_role.value for allowed_role in allowed_roles}
        if role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permissions",
            )
        return claims

    return _role_dependency


def require_user_provisioner():
    """Require an authenticated top_management user whose username is also in
    USER_PROVISIONING_ALLOWLIST.

    Use this (instead of ``require_role(UserRole.top_management)``) on any
    endpoint that creates or provisions new user accounts, so that power is
    scoped to specific named admins rather than every top_management account.

    JWT claims only contain user_id, so the username is fetched from the DB
    on each call before being checked case-insensitively against the allowlist.
    """

    async def _provisioner_dependency(
        claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
        db: AsyncIOMotorDatabase = Depends(get_database),
    ) -> dict[str, Any]:
        user_id = claims.get("user_id")
        user_doc = await db["users"].find_one({"user_id": user_id}, {"username": 1})
        username = (user_doc or {}).get("username", "")
        if not username or username.strip().lower() not in USER_PROVISIONING_ALLOWLIST:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to create or provision users.",
            )
        return claims

    return _provisioner_dependency


async def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any] | None:
    """Return user claims when a valid access token is provided, otherwise None."""
    if not token:
        return None
    return await auth_service.get_current_user(token=token, db=db)