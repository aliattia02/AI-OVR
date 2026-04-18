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

app = FastAPI(
    title="E·OVR API",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
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
        "ai_provider": os.getenv("AI_PROVIDER", ""),
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
