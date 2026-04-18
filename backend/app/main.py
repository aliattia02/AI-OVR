"""backend/app/main.py — Entry point for the E·OVR FastAPI application; registers routers and middleware."""

from __future__ import annotations

from fastapi import FastAPI

from app.db.database import lifespan
from app.routers import ai, analytics, auth, exports, facilities, incidents, patients, users

app = FastAPI(title="E·OVR API", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(patients.router)
app.include_router(facilities.router)
app.include_router(analytics.router)
app.include_router(exports.router)
app.include_router(users.router)
app.include_router(ai.router)
