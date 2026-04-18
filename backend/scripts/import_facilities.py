"""Import facilities CSV into MongoDB with upsert behavior."""

from __future__ import annotations

import argparse
import csv
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

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


def _normalise(value: str) -> str:
    return value.strip()


def _normalise_facility_type(value: str) -> str:
    return _normalise(value).replace("مستشفي", "مستشفى")


def _pick(row: dict[str, str], keys: tuple[str, ...]) -> str:
    normalised = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
    for key in keys:
        value = normalised.get(key.strip().lower())
        if value:
            return value
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Import facilities from CSV.")
    parser.add_argument("csv_path", help="Absolute or relative path to Facilities.csv")
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    load_dotenv()
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL is required in .env")
    db_name = _resolve_db_name(mongo_url)

    upserted_count = 0
    with MongoClient(mongo_url) as client:
        facilities = client[db_name]["facilities"]
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                governorate = _pick(row, ("governorate", "المحافظة"))
                administration = _pick(row, ("administration", "الإدارة", "الادارة"))
                facility_name = _pick(row, ("facility_name", "facility", "اسم المنشأة", "اسم المنشاه"))
                facility_type = _normalise_facility_type(_pick(row, ("facility_type", "type", "نوع المنشأة", "نوع المنشاه")))

                if not governorate or not facility_name:
                    continue

                result = facilities.update_one(
                    {"governorate": governorate, "facility_name": facility_name},
                    {
                        "$set": {
                            "governorate": governorate,
                            "administration": administration,
                            "facility_name": facility_name,
                            "facility_type": facility_type,
                        },
                        "$setOnInsert": {
                            "patient_link_uuid": str(uuid4()),
                            "created_at": datetime.now(tz=timezone.utc),
                        },
                    },
                    upsert=True,
                )
                if result.upserted_id is not None or result.modified_count > 0:
                    upserted_count += 1

    print(f"total upserted: {upserted_count}")


if __name__ == "__main__":
    main()
