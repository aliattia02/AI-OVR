"""backend/app/models/ai_metadata.py — Pydantic models for AI classification metadata attached to incidents in E·OVR."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class AIFeedback(BaseModel):
    """Human-review feedback recorded when a Quality Admin overrides an AI suggestion.

    All fields are null until a reviewer explicitly acts on the AI output.
    """

    ai_suggested: Optional[str] = None   # What the model suggested
    human_chose: Optional[str] = None    # What Quality Admin chose instead
    reviewer_id: Optional[str] = None    # User ID of reviewer
    reviewed_at: Optional[datetime] = None


class AIMetadata(BaseModel):
    """AI-generated metadata subdocument embedded in every incident document.

    All fields default to null/empty and are populated only when an AI model is
    active.  When AI_PROVIDER=none they remain null indefinitely — this is by
    design, not an error.  Call AIMetadata.empty() at incident creation so the
    subdocument always exists in the stored document.
    """

    auto_classification: Optional[str] = None        # AI-suggested ErrorClassification; null until model integrated (e.g. Gemini 2.5, Claude, GPT-4o)
    auto_event_type: Optional[str] = None             # AI-suggested EventType; null until model integrated
    classification_score: Optional[float] = None     # Model confidence 0.0–1.0
    ai_risk_score: Optional[int] = None              # AI risk — never overwrites human risk_score
    similar_incident_ids: List[str] = []
    signal_flags: List[str] = []
    embedding_vector: Optional[List[float]] = None   # 1536-dim, Atlas Vector Search
    embedding_id: Optional[str] = None
    model_version: Optional[str] = None
    processed_at: Optional[datetime] = None
    human_reviewed: bool = False
    feedback: AIFeedback = AIFeedback()

    @classmethod
    def empty(cls) -> "AIMetadata":
        """Return a default AIMetadata instance with all fields at their null/empty defaults.

        Called at incident creation so the subdocument always exists in the stored document.
        """
        return cls()
