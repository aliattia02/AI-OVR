"""backend/app/main.py — Entry point for the E·OVR FastAPI application; registers routers and middleware."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import time

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import lifespan as db_lifespan
from app.routers import ai, analytics, auth, exports, facilities, health, incidents, patients, users
from app.startup_checks import validate_required_env_vars

APP_VERSION = "2.0.0"

environment = (os.getenv("ENVIRONMENT") or "").strip().lower()
is_production = environment == "production"
logger = logging.getLogger(__name__)


def _get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY", "")


def _resolve_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    if not origins:
        if not is_production:
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
        logger.warning(
            "CORS_ORIGINS is empty in production; browser clients may not reach the API."
        )

    if any(origin == "*" for origin in cors_origins):
        raise EnvironmentError(
            "CORS_ORIGINS cannot include '*' when credentials are enabled."
        )

    jwt_secret = _get_jwt_secret()
    if not jwt_secret or "change_me" in jwt_secret:
        raise EnvironmentError(
            "JWT_SECRET must be set to a strong, non-default value in production."
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    validate_required_env_vars()
    async with db_lifespan(app):
        yield


app = FastAPI(
    title="E·OVR API",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

cors_origins = _resolve_cors_origins()
_validate_startup_settings(cors_origins)

# ── DEBUG middleware (remove before production) ───────────────────────────────
@app.middleware("http")
async def debug_request_logger(request: Request, call_next):
    start = time.time()
    origin = request.headers.get("origin", "no-origin")
    logger.warning(
        ">>> REQUEST  %s %s  |  origin=%s  |  client=%s",
        request.method,
        request.url.path,
        origin,
        request.client,
    )
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(">>> HANDLER CRASHED: %s", exc, exc_info=True)
        raise
    elapsed = (time.time() - start) * 1000
    logger.warning(
        "<<< RESPONSE %s %s  |  status=%s  |  %.0f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response
# ─────────────────────────────────────────────────────────────────────────────

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
app.include_router(health.router)


@app.get("/ping")
async def ping() -> dict[str, str]:
    """Instant health check — no DB, no auth. Use to verify backend is reachable."""
    return {"pong": "ok", "cors_origins": str(cors_origins)}


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