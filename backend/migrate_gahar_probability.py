"""backend/scripts/migrate_gahar_probability.py

One-time migration script to bring existing MongoDB documents into alignment
with the GAHAR data model after the JCI → GAHAR migration.

Changes applied:
  1. Probability coercion — maps JCI 3-level values to GAHAR 4-level equivalents:
       "High"   → "Frequent"
       "Medium" → "Occasional"
       "Low"    → "Remote"

  2. risk_score clamp — sets risk_score to null for any document where the stored
     value is outside the GAHAR SAC range (1–3).  These are JCI-era scores
     (1–9) that would be misleading on the new SAC risk matrix.  Quality Admins
     will be prompted to re-assess those incidents.

  3. jci_* field removal — unsets the seven legacy JCI accreditation fields
     that are no longer part of the schema:
       jci_chapter, jci_standard, jci_measurable_element,
       jci_compliance_status, jci_evidence, jci_gap_analysis, jci_action_plan

Run once against the live database after deploying the GAHAR model changes:

    python -m backend.scripts.migrate_gahar_probability

The script is idempotent: re-running it after all documents are migrated
results in zero modifications (updateMany matches zero documents).
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME") or ""

# JCI 3-level → GAHAR 4-level probability mapping (mirrors IncidentInDB._LEGACY_PROBABILITY)
PROBABILITY_MAP: dict[str, str] = {
    "High":   "Frequent",
    "Medium": "Occasional",
    "Low":    "Remote",
}

# Legacy JCI accreditation fields to remove from every document
JCI_FIELDS_TO_UNSET = {
    "jci_chapter":             "",
    "jci_standard":            "",
    "jci_measurable_element":  "",
    "jci_compliance_status":   "",
    "jci_evidence":            "",
    "jci_gap_analysis":        "",
    "jci_action_plan":         "",
}


async def run_migration() -> None:
    client = AsyncIOMotorClient(MONGO_URL)
    try:
        col = client[DB_NAME]["incidents"]

        # ── 1. Probability coercion ───────────────────────────────────────────
        total_prob_updated = 0
        for legacy_val, gahar_val in PROBABILITY_MAP.items():
            result = await col.update_many(
                {"probability": legacy_val},
                {"$set": {"probability": gahar_val}},
            )
            if result.modified_count:
                logger.info(
                    "probability  '%s' → '%s'  (%d document(s))",
                    legacy_val, gahar_val, result.modified_count,
                )
            total_prob_updated += result.modified_count
        logger.info("Probability migration complete — %d document(s) updated.", total_prob_updated)

        # ── 2. risk_score clamp — null out JCI-era scores outside SAC 1–3 ─────
        result = await col.update_many(
            {"risk_score": {"$gt": 3}},
            {"$set": {"risk_score": None}},
        )
        logger.info(
            "risk_score clamp complete — %d document(s) reset to null (re-assessment required).",
            result.modified_count,
        )

        # ── 3. Remove legacy jci_* fields ─────────────────────────────────────
        # Only target documents that still carry at least one jci_* field so that
        # the $unset is skipped for documents that are already clean.
        jci_exists_filter = {"$or": [
            {field: {"$exists": True}} for field in JCI_FIELDS_TO_UNSET
        ]}
        result = await col.update_many(
            jci_exists_filter,
            {"$unset": JCI_FIELDS_TO_UNSET},
        )
        logger.info(
            "jci_* field removal complete — %d document(s) updated.",
            result.modified_count,
        )

    finally:
        client.close()
        logger.info("Migration finished.")


if __name__ == "__main__":
    asyncio.run(run_migration())