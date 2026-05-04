"""backend/app/db/database.py — Manages the MongoDB connection lifecycle (connect/disconnect) and exposes the database client for E·OVR."""

from __future__ import annotations

import base64
import binascii
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.encryption_options import AutoEncryptionOpts

load_dotenv()
logger = logging.getLogger(__name__)

_mongo_url = os.getenv("MONGO_URL", "")
MONGO_URL: str = _mongo_url

_db_name = os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME") or ""
DB_NAME: str = _db_name

# Module-level client, populated by the lifespan context manager.
_client: AsyncIOMotorClient | None = None


def _is_truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _build_auto_encryption_opts() -> AutoEncryptionOpts | None:
    """Build CSFLE auto-encryption options for medical_file_number when enabled.

    Requires:
    - CSFLE_ENABLED=true
    - CSFLE_LOCAL_MASTER_KEY=<base64-encoded 96-byte key>
    Optional:
    - CSFLE_KEY_VAULT_NAMESPACE=encryption.__keyVault
    """
    if not _is_truthy(os.getenv("CSFLE_ENABLED")):
        return None

    master_key_b64 = os.getenv("CSFLE_LOCAL_MASTER_KEY", "").strip()
    if not master_key_b64:
        raise EnvironmentError("Required encryption configuration is missing.")

    try:
        master_key = base64.b64decode(master_key_b64)
    except (binascii.Error, ValueError) as exc:
        raise EnvironmentError("CSFLE_LOCAL_MASTER_KEY must be valid base64.") from exc

    if len(master_key) != 96:
        raise EnvironmentError("CSFLE_LOCAL_MASTER_KEY must decode to exactly 96 bytes.")

    key_vault_namespace = os.getenv("CSFLE_KEY_VAULT_NAMESPACE", "encryption.__keyVault")
    schema_map = {
        f"{DB_NAME}.incidents": {
            "bsonType": "object",
            "properties": {
                "medical_file_number": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
                    }
                },
                "involved_person": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
                "responsible_manager": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
                "disclosure_responsible": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
                "description": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
                "specific_error": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
                "notes": {
                    "encrypt": {
                        "bsonType": "string",
                        "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
                    }
                },
            },
        }
    }
    return AutoEncryptionOpts(
        kms_providers={"local": {"key": master_key}},
        key_vault_namespace=key_vault_namespace,
        schema_map=schema_map,
    )


def get_database() -> AsyncIOMotorDatabase:
    """Return the Motor database instance.

    Must be called after the lifespan context manager has started.
    Raises RuntimeError if called before startup.
    """
    if _client is None:
        raise RuntimeError(
            "Database client is not initialised. "
            "Ensure the lifespan context manager has started."
        )
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

    Creates a Motor client on startup, runs create_indexes(), then closes
    cleanly on shutdown. Wire into FastAPI(lifespan=lifespan) in main.py.
    """
    global _client  # noqa: PLW0603

    # Import here to avoid circular imports at module load time
    from app.db.indexes import create_indexes  # noqa: PLC0415

    auto_encryption_opts = _build_auto_encryption_opts()
    _client = AsyncIOMotorClient(MONGO_URL, auto_encryption_opts=auto_encryption_opts)
    if auto_encryption_opts is not None:
        logger.info("CSFLE auto-encryption enabled for incidents.medical_file_number.")
    db = _client[DB_NAME]

    await create_indexes(db)

    try:
        yield
    finally:
        _client.close()
        _client = None
