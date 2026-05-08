"""backend/app/routers/analytics.py — API routes for incident analytics, trend data, and comparison reports in E·OVR."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.database import get_database
from app.services import auth_service
from app.utils.helpers import get_scope_filter

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Shared filter params (declared once, reused on each endpoint via Depends) ─
#
# FastAPI does not support sharing Query params via a plain function without
# Depends, so we use a dataclass-style dependency for the dashboard filter set.

class DashboardFilters:
    """Dependency that collects the five dashboard filter dimensions.

    All fields are optional. Omitted or empty params are treated as "no filter".
    """

    def __init__(
        self,
        governorate: str | None = Query(default=None, description="Filter by governorate name"),
        administration: str | None = Query(default=None, description="Filter by administration name"),
        facility_type: str | None = Query(default=None, description="Filter by facility type"),
        facility_name: str | None = Query(default=None, description="Filter by exact facility name"),
        creation_from: date | None = Query(default=None, description="Earliest registration date (inclusive), YYYY-MM-DD"),
        creation_to: date | None = Query(default=None, description="Latest registration date (inclusive), YYYY-MM-DD"),
        occurrence_from: date | None = Query(default=None, description="Earliest occurrence date (inclusive), YYYY-MM-DD"),
        occurrence_to: date | None = Query(default=None, description="Latest occurrence date (inclusive), YYYY-MM-DD"),
    ) -> None:
        self.governorate    = governorate
        self.administration = administration
        self.facility_type  = facility_type
        self.facility_name  = facility_name
        self.creation_from  = creation_from
        self.creation_to    = creation_to
        self.occurrence_from = occurrence_from
        self.occurrence_to   = occurrence_to


# ── Internal helpers ──────────────────────────────────────────────────────────

def _require_tier(claims: dict[str, Any], min_tier: int) -> None:
    try:
        tier = int(claims.get("tier") or 0)
    except (TypeError, ValueError):
        tier = 0
    if tier < min_tier:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient tier permissions")


def _date_expr() -> dict[str, Any]:
    """Coerce registration_date to a BSON date regardless of storage type.

    Motor stores datetime objects as BSON dates, but early records may have
    been written as ISO strings. This expression handles both.
    """
    return {
        "$cond": [
            {"$eq": [{"$type": "$registration_date"}, "date"]},
            "$registration_date",
            {"$dateFromString": {"dateString": "$registration_date"}},
        ]
    }


def _build_extra_match(f: DashboardFilters) -> dict[str, Any]:
    """Return a MongoDB $match sub-document from dashboard filter params.

    Only includes fields that were explicitly provided. The result is merged
    with the role-scope filter before being passed to the aggregation pipeline.

    occurrence_date is stored as an ISO-8601 string ("YYYY-MM-DD"), so lexical
    string comparison is correct and intentional.
    """
    extra: dict[str, Any] = {}

    if f.governorate:
        extra["governorate"] = f.governorate
    if f.administration:
        extra["administration"] = f.administration
    if f.facility_type:
        extra["facility_type"] = f.facility_type
    if f.facility_name:
        extra["facility_name"] = f.facility_name

    if f.occurrence_from or f.occurrence_to:
        occ: dict[str, str] = {}
        if f.occurrence_from:
            occ["$gte"] = f.occurrence_from.isoformat()
        if f.occurrence_to:
            occ["$lte"] = f.occurrence_to.isoformat()
        extra["occurrence_date"] = occ

    return extra


def _creation_date_stages(
    f: DashboardFilters,
    floor: datetime | None = None,
) -> list[dict[str, Any]]:
    """Return the [$addFields, $match] pipeline stages for registration_date filtering.

    Args:
        f:     Dashboard filter dependency.
        floor: Optional lower bound enforced even when creation_from is absent
               (used by the trends endpoint to maintain its 12-month window).

    Returns:
        An empty list when no creation-date filter is active (and no floor is
        provided), avoiding unnecessary pipeline stages.
    """
    lower: datetime | None = floor
    upper: datetime | None = None

    if f.creation_from:
        cf = datetime(f.creation_from.year, f.creation_from.month, f.creation_from.day, tzinfo=timezone.utc)
        lower = max(floor, cf) if floor else cf

    if f.creation_to:
        upper = datetime(
            f.creation_to.year, f.creation_to.month, f.creation_to.day,
            23, 59, 59, tzinfo=timezone.utc,
        )

    if lower is None and upper is None:
        return []

    bounds: dict[str, datetime] = {}
    if lower:
        bounds["$gte"] = lower
    if upper:
        bounds["$lte"] = upper

    return [
        {"$addFields": {"_reg_dt": _date_expr()}},
        {"$match": {"_reg_dt": bounds}},
    ]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=dict[str, Any])
async def analytics_summary(
    f: DashboardFilters = Depends(),
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    """Aggregated status / severity / event-type counts, scoped by role and filters."""
    _require_tier(claims, min_tier=2)

    scope = get_scope_filter(claims["role"], claims)
    extra = _build_extra_match(f)

    pipeline: list[dict[str, Any]] = [{"$match": {**scope, **extra}}]
    pipeline.extend(_creation_date_stages(f))
    pipeline.append(
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
        }
    )

    results = await db["incidents"].aggregate(pipeline).to_list(length=1)
    return results[0] if results else {"status": [], "severity": [], "event_type": []}


@router.get("/trends", response_model=list[dict[str, Any]])
async def analytics_trends(
    f: DashboardFilters = Depends(),
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict[str, Any]]:
    """Monthly incident counts for the last 12 months, scoped by role and filters.

    When creation_from is provided it is intersected with the 12-month floor
    (whichever is later wins). When creation_to is provided the window is
    capped accordingly.
    """
    _require_tier(claims, min_tier=3)

    scope = get_scope_filter(claims["role"], claims)
    extra = _build_extra_match(f)

    now = datetime.now(tz=timezone.utc)
    start_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    twelve_month_floor = datetime(start_month.year - 1, start_month.month, 1, tzinfo=timezone.utc)

    # _creation_date_stages always gets a floor here so the 12-month window is
    # preserved even when the caller does not supply creation_from.
    date_stages = _creation_date_stages(f, floor=twelve_month_floor)

    pipeline: list[dict[str, Any]] = [
        {"$match": {**scope, **extra}},
        # _creation_date_stages adds the $addFields + $match for registration_date.
        # The field alias used inside those stages is _reg_dt, but we rename it to
        # registration_dt here for the $group stage below.
        *date_stages,
    ]

    # After the date stages the cast field is available as _reg_dt (or not added
    # when no date filter and no floor — but floor is always provided here).
    # Re-alias to registration_dt for the group stage for clarity.
    if date_stages:
        pipeline.append({"$addFields": {"registration_dt": "$_reg_dt"}})
    else:
        pipeline.append({"$addFields": {"registration_dt": _date_expr()}})

    pipeline += [
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
    f: DashboardFilters = Depends(),
    claims: dict[str, Any] = Depends(auth_service.get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict[str, Any]]:
    """Incident counts grouped by facility or governorate, scoped by role and filters."""
    _require_tier(claims, min_tier=4)

    scope = get_scope_filter(claims["role"], claims)
    extra = _build_extra_match(f)
    group_field = "$facility_name" if dimension == "facility" else "$governorate"

    pipeline: list[dict[str, Any]] = [{"$match": {**scope, **extra}}]
    pipeline.extend(_creation_date_stages(f))
    pipeline += [
        {"$group": {"_id": group_field, "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$project": {"_id": 0, "label": "$_id", "count": 1}},
    ]

    return await db["incidents"].aggregate(pipeline).to_list(length=None)