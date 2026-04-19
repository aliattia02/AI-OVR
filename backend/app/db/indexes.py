"""backend/app/db/indexes.py — Defines and creates MongoDB indexes to optimize query performance for E·OVR collections."""

from __future__ import annotations

# NOTE: Atlas Vector Search index on ai_metadata.embedding_vector must be
# created manually in the Atlas UI (see docs/atlas_vector_search_setup.md).
# It cannot be created via the Motor driver.

import pymongo
from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create all application indexes on the given Motor database.

    Safe to call on every startup — MongoDB is idempotent for existing indexes
    with matching options.

    Args:
        db: An ``AsyncIOMotorDatabase`` instance (from ``get_database()``).
    """

    # ── incidents ─────────────────────────────────────────────────────────────
    incidents = db["incidents"]

    # Full-text search on free-text description field
    await incidents.create_index([("description", pymongo.TEXT)], name="incidents_description_text")
    await incidents.create_index([("incident_id", pymongo.ASCENDING)], unique=True, name="incidents_incident_id_unique")

    # Filtering / aggregation indexes
    await incidents.create_index([("governorate", pymongo.ASCENDING)], name="incidents_governorate")
    await incidents.create_index([("administration", pymongo.ASCENDING)], name="incidents_administration")
    await incidents.create_index([("status", pymongo.ASCENDING)], name="incidents_status")
    await incidents.create_index([("registration_date", pymongo.DESCENDING)], name="incidents_registration_date")
    await incidents.create_index([("reporter_type", pymongo.ASCENDING)], name="incidents_reporter_type")

    # ── facilities ────────────────────────────────────────────────────────────
    facilities = db["facilities"]

    # Each facility has a unique UUID used to link anonymous patient submissions
    await facilities.create_index(
        [("patient_link_uuid", pymongo.ASCENDING)],
        unique=True,
        name="facilities_patient_link_uuid_unique",
    )

    # Common lookup pattern: filter by region then narrow by administration
    await facilities.create_index(
        [("governorate", pymongo.ASCENDING), ("administration", pymongo.ASCENDING)],
        name="facilities_governorate_administration",
    )

    # ── users ─────────────────────────────────────────────────────────────────
    users = db["users"]

    # Email must be globally unique across all user accounts
    await users.create_index(
        [("email", pymongo.ASCENDING)],
        unique=True,
        name="users_email_unique",
    )
