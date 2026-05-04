"""backend/app/main.py — Entry point for the E·OVR FastAPI application; registers routers and middleware."""

from __future__ import annotations

import os

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import lifespan
from app.routers import ai, analytics, auth, exports, facilities, incidents, patients, users

APP_VERSION = "2.0.0"

environment = (os.getenv("ENVIRONMENT") or "").strip().lower()
is_production = environment == "production"


def _get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY", "")


def _resolve_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    if not origins:
        frontend_url = os.getenv("FRONTEND_URL", "").strip()
        if frontend_url:
            origins = [frontend_url]
        elif not is_production:
            origins = ["http://localhost:3000", "http://localhost:5173"]

    deduped: list[str] = []
    seen: set[str] = set()
    for origin in origins:
        if origin in seen:
            continue
        seen.add(origin)
        deduped.append(origin)
    return deduped


def _validate_startup_settings(cors_origins: list[str]) -> None:
    if not is_production:
        return

    if not cors_origins:
        raise EnvironmentError(
            "CORS_ORIGINS must be set in production to allow the frontend to reach the API."
        )

    if any(origin == "*" for origin in cors_origins):
        raise EnvironmentError(
            "CORS_ORIGINS cannot include '*' when allow_credentials is enabled."
        )

    jwt_secret = _get_jwt_secret()
    if not jwt_secret or "change_me" in jwt_secret:
        raise EnvironmentError(
            "JWT_SECRET must be set to a strong, non-default value in production."
        )

app = FastAPI(
    title="E·OVR API",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

cors_origins = _resolve_cors_origins()
_validate_startup_settings(cors_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(patients.router)
app.include_router(facilities.router)
app.include_router(analytics.router)
app.include_router(exports.router)
app.include_router(users.router)
app.include_router(ai.router)


@app.get("/")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "version": APP_VERSION,
        "ai_provider": os.getenv("AI_PROVIDER", "none"),
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    _ = request
    field_errors: list[dict[str, str]] = []
    for error in exc.errors():
        loc = error.get("loc", ())
        field = ".".join(str(part) for part in loc if part not in {"body", "query", "path"})
        field_errors.append(
            {
                "field": field or "unknown",
                "message": str(error.get("msg", "Invalid value")),
                "type": str(error.get("type", "validation_error")),
            }
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": field_errors},
    )
