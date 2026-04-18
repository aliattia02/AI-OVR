"""backend/app/routers/ai.py — AI namespace reserved. Classification runs at submission time via ai_service. Stubs below return 501 until data thresholds are reached."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.database import get_database
from app.middleware.auth_middleware import require_role
from app.models.ai_metadata import AIMetadata
from app.services import ai_service, incident_service
from app.utils.enums import UserRole

router = APIRouter(prefix="/ai", tags=["ai"])


class AIProviderDisabledResponse(BaseModel):
    """Response when AI provider is not configured."""

    status: str
    message: str


class BatchClassifyResponse(BaseModel):
    """Response for batch classification jobs."""

    processed: int


class AIFeedbackRequest(BaseModel):
    """Quality-admin feedback payload for AI suggestion review."""

    ai_suggested: str | None = None
    human_chose: str | None = None


class ModelRegistryCreateRequest(BaseModel):
    """Model registry creation payload."""

    name: str
    version: str
    provider: str
    model_type: str
    metadata: dict[str, Any] | None = None


class MessageResponse(BaseModel):
    """Simple message response payload."""

    message: str


def _no_model_configured() -> AIProviderDisabledResponse:
    return AIProviderDisabledResponse(
        status="no_model_configured",
        message="Set AI_PROVIDER in .env to enable classification.",
    )


@router.post(
    "/classify/{incident_id}",
    response_model=AIMetadata | AIProviderDisabledResponse,
)
async def classify_incident_now(
    incident_id: str,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AIMetadata | AIProviderDisabledResponse:
    _ = claims
    incident_doc = await db["incidents"].find_one({"incident_id": incident_id})
    if incident_doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if ai_service.AI_PROVIDER == "none":
        return _no_model_configured()

    facility_context = (
        f"{incident_doc.get('facility_name', '')} "
        f"({incident_doc.get('facility_type', '')}), "
        f"{incident_doc.get('governorate', '')}"
    ).strip()
    ai_result = await ai_service.classify_incident(
        description=str(incident_doc.get("description", "")),
        facility_context=facility_context,
    )
    if ai_result is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI classification failed")

    await db["incidents"].update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "ai_metadata.auto_classification": ai_result.auto_classification,
                "ai_metadata.auto_event_type": ai_result.auto_event_type,
                "ai_metadata.classification_score": ai_result.classification_score,
                "ai_metadata.ai_risk_score": ai_result.ai_risk_score,
                "ai_metadata.signal_flags": ai_result.signal_flags,
                "ai_metadata.model_version": ai_result.model_version,
                "ai_metadata.processed_at": ai_result.processed_at.isoformat() if ai_result.processed_at else None,
            }
        },
    )

    updated_doc = await db["incidents"].find_one({"incident_id": incident_id}, {"_id": 0, "ai_metadata": 1})
    if updated_doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return AIMetadata.model_validate(updated_doc.get("ai_metadata", {}))


@router.post(
    "/classify/batch",
    response_model=BatchClassifyResponse | AIProviderDisabledResponse,
)
async def classify_batch(
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> BatchClassifyResponse | AIProviderDisabledResponse:
    _ = claims
    if ai_service.AI_PROVIDER == "none":
        return _no_model_configured()

    processed = await ai_service.batch_classify_unprocessed(db)
    return BatchClassifyResponse(processed=processed)


@router.post("/feedback/{incident_id}", response_model=MessageResponse)
async def submit_feedback(
    incident_id: str,
    payload: AIFeedbackRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.quality_admin)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    updated = await incident_service.save_ai_feedback(
        incident_id=incident_id,
        ai_suggested=payload.ai_suggested,
        human_chose=payload.human_chose,
        reviewer_id=claims["user_id"],
        db=db,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return MessageResponse(message="AI feedback saved")


@router.get("/models", response_model=list[dict[str, Any]])
async def list_models(
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict[str, Any]]:
    _ = claims
    docs = await db["model_registry"].find({}).to_list(length=None)
    output: list[dict[str, Any]] = []
    for doc in docs:
        item = dict(doc)
        if "_id" in item:
            item["_id"] = str(item["_id"])
        output.append(item)
    return output


@router.post("/models", response_model=dict[str, str], status_code=status.HTTP_201_CREATED)
async def create_model(
    payload: ModelRegistryCreateRequest,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, str]:
    _ = claims
    doc = payload.model_dump()
    result = await db["model_registry"].insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.get("/similar/{incident_id}", response_model=MessageResponse)
async def similar_incidents_stub(
    incident_id: str,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
) -> MessageResponse:
    _ = (incident_id, claims)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Vector search available at 1,000+ incidents.",
    )


@router.get("/signals", response_model=MessageResponse)
async def signals_stub(
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
) -> MessageResponse:
    _ = claims
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Signal detection available after 6 months of data.",
    )


@router.get("/signals/{governorate}", response_model=MessageResponse)
async def signals_governorate_stub(
    governorate: str,
    claims: dict[str, Any] = Depends(require_role(UserRole.top_management)),
) -> MessageResponse:
    _ = (governorate, claims)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Signal detection available after 6 months of data.",
    )
