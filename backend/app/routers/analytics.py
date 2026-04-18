"""backend/app/routers/analytics.py — API routes for incident analytics, trend data, and comparison reports in E·OVR."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.services import auth_service
from app.utils.helpers import get_scope_filter

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _require_tier(claims: dict[str, Any], min_tier: int) -> None:
    tier = int(claims.get("tier", 0))
    if tier < min_tier:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient tier permissions")


def _date_expr() -> dict[str, Any]:
    return {
        "$cond": [
            {"$eq": [{"$type": "$registration_date"}, "date"]},
            "$registration_date",
            {"$dateFromString": {"dateString": "$registration_date"}},
        ]
    }


@router.get("/summary", response_model=dict[str, Any])
async def analytics_summary(
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    _require_tier(claims, min_tier=2)
    scope = get_scope_filter(claims["role"], claims)

    pipeline = [
        {"$match": scope},
        {
            "$facet": {
                "status": [
                    {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "key": "$_id", "count": 1}},
                ],
                "severity": [
                    {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "key": "$_id", "count": 1}},
                ],
                "event_type": [
                    {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "key": "$_id", "count": 1}},
                ],
            }
        },
    ]
    results = await db["incidents"].aggregate(pipeline).to_list(length=1)
    return results[0] if results else {"status": [], "severity": [], "event_type": []}


@router.get("/trends", response_model=list[dict[str, Any]])
async def analytics_trends(
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict[str, Any]]:
    _require_tier(claims, min_tier=3)
    scope = get_scope_filter(claims["role"], claims)

    now = datetime.now(tz=timezone.utc)
    start_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    start_window = datetime(start_month.year - 1, start_month.month, 1, tzinfo=timezone.utc)

    pipeline = [
        {"$match": scope},
        {"$addFields": {"registration_dt": _date_expr()}},
        {"$match": {"registration_dt": {"$gte": start_window}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$registration_dt"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "month": "$_id", "count": 1}},
    ]
    return await db["incidents"].aggregate(pipeline).to_list(length=None)


@router.get("/compare", response_model=list[dict[str, Any]])
async def analytics_compare(
    dimension: str = Query(default="facility", pattern="^(facility|governorate)$"),
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict[str, Any]]:
    _require_tier(claims, min_tier=4)
    scope = get_scope_filter(claims["role"], claims)
    group_field = "$facility_name" if dimension == "facility" else "$governorate"

    pipeline = [
        {"$match": scope},
        {"$group": {"_id": group_field, "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$project": {"_id": 0, "label": "$_id", "count": 1}},
    ]
    return await db["incidents"].aggregate(pipeline).to_list(length=None)
