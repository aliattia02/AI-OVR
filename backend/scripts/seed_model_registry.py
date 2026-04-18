"""Seed a placeholder model registry document if it does not already exist."""

from __future__ import annotations

import os
from urllib.parse import urlparse

from dotenv import load_dotenv
from pymongo import MongoClient


def _resolve_db_name(mongo_url: str) -> str:
    db_name = os.getenv("DB_NAME") or os.getenv("MONGO_DB_NAME")
    if db_name:
        return db_name
    parsed = urlparse(mongo_url)
    parsed_name = parsed.path.lstrip("/")
    if parsed_name:
        return parsed_name
    raise RuntimeError("Database name is required via DB_NAME/MONGO_DB_NAME or in MONGO_URL path.")


def main() -> None:
    load_dotenv()
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL is required in .env")

    db_name = _resolve_db_name(mongo_url)

    payload = {
        "model_name": "placeholder",
        "model_type": "classification",
        "version": "0.0.0",
        "is_active": False,
        "provider": "none",
        "training_incident_count": 0,
        "languages": ["ar"],
    }
    query = {
        "model_name": payload["model_name"],
        "model_type": payload["model_type"],
        "version": payload["version"],
    }

    with MongoClient(mongo_url) as client:
        model_registry = client[db_name]["model_registry"]
        existing = model_registry.find_one(query, {"_id": 1})
        if existing:
            print("already exists — skipped")
            return
        model_registry.insert_one(payload)
        print("seeded")


if __name__ == "__main__":
    main()
