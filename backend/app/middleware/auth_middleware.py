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


async def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any] | None:
    """Return user claims when a valid access token is provided, otherwise None."""
    if not token:
        return None
    return await auth_service.get_current_user(token=token, db=db)
