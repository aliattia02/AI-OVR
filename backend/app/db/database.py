"""backend/app/db/database.py — Manages the MongoDB connection lifecycle (connect/disconnect) and exposes the database client for E·OVR."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

load_dotenv()

_mongo_url = os.getenv("MONGO_URL")
if not _mongo_url:
    raise EnvironmentError(
        "MONGO_URL environment variable is not set. "
        "Copy .env.example to .env and provide a valid MongoDB connection string."
    )
MONGO_URL: str = _mongo_url
_db_name = os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME")
if not _db_name:
    raise EnvironmentError(
        "DB_NAME environment variable is not set. "
        "Copy .env.example to .env and provide a database name "
        "(legacy key MONGO_DB_NAME is also supported)."
    )
DB_NAME: str = _db_name

# Module-level client, populated by the lifespan context manager.
# A module-level reference is necessary because Motor clients are not
# thread-local and must be shared across the entire application process.
_client: AsyncIOMotorClient | None = None


def get_database() -> AsyncIOMotorDatabase:
    """Return the Motor database instance.

    Must be called after the lifespan context manager has started (i.e. after
    application startup).  Raises ``RuntimeError`` if called before startup.
    """
    if _client is None:
        raise RuntimeError("Database client is not initialised. Ensure the lifespan context manager has started.")
    return _client[DB_NAME]


# ── Collection helpers ────────────────────────────────────────────────────────

def get_incidents_col():
    """Return the ``incidents`` collection."""
    return get_database()["incidents"]


def get_users_col():
    """Return the ``users`` collection."""
    return get_database()["users"]


def get_facilities_col():
    """Return the ``facilities`` collection."""
    return get_database()["facilities"]


def get_model_registry_col():
    """Return the ``model_registry`` collection."""
    return get_database()["model_registry"]


# ── FastAPI lifespan ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:  # noqa: ANN001
    """FastAPI lifespan context manager.

    Creates a Motor client on application startup and closes it cleanly on
    shutdown.  Wire into ``FastAPI(lifespan=lifespan)`` in main.py.

    Example::

        from fastapi import FastAPI
        from app.db.database import lifespan

        app = FastAPI(lifespan=lifespan)
    """
    global _client  # noqa: PLW0603
    _client = AsyncIOMotorClient(MONGO_URL)
    try:
        yield
    finally:
        _client.close()
        _client = None
