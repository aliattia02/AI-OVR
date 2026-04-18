"""backend/app/services/ai_service.py — Integration layer for AI/ML model calls that classify incidents and compute risk scores in E·OVR."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from dotenv import load_dotenv

from app.models.ai_metadata import AIMetadata
from app.utils.enums import AIProvider, ErrorClassification, EventType

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────
# Loaded once at module import.  If AI_PROVIDER is "none" or AI_API_KEY is
# blank, _ENABLED is False and every public function returns None immediately.
AI_PROVIDER: str = os.getenv("AI_PROVIDER", AIProvider.none.value).lower()
AI_API_KEY: str = os.getenv("AI_API_KEY", "")
AI_MODEL: str = os.getenv("AI_MODEL", "")

_ENABLED: bool = AI_PROVIDER != AIProvider.none.value and bool(AI_API_KEY)

_VALID_CLASSIFICATIONS: frozenset[str] = frozenset(e.value for e in ErrorClassification)
_VALID_EVENT_TYPES: frozenset[str] = frozenset(e.value for e in EventType)


# ── Prompt ────────────────────────────────────────────────────────────────────

async def get_classification_prompt(description: str, facility_context: str) -> str:
    """Return the zero-shot system prompt used for incident classification.

    Kept as a standalone async function so the prompt template can be updated
    without touching the call logic in :func:`classify_incident`.

    The model is instructed to return **only** a JSON object with this shape::

        {
            "error_classification": "<one of ErrorClassification enum values>",
            "event_type":           "<one of EventType enum values>",
            "classification_score": <float 0.0–1.0>,
            "ai_risk_score":        <integer 1–9>,
            "signal_flags":         [<zero or more short alert strings>]
        }

    Args:
        description:      Free-text incident description supplied by the reporter.
        facility_context: Short string identifying the facility (used as context).

    Returns:
        The fully rendered prompt string ready for submission to an LLM.
    """
    valid_classifications = ", ".join(sorted(_VALID_CLASSIFICATIONS))
    valid_event_types = ", ".join(sorted(_VALID_EVENT_TYPES))

    return (
        "You are an expert clinical-quality analyst at a Saudi healthcare facility.\n"
        f"Facility context: {facility_context}\n\n"
        "Analyze the incident description below and return ONLY a JSON object — "
        "no markdown, no explanation, no surrounding text — with this exact structure:\n"
        "{\n"
        f'  "error_classification": "<one of: {valid_classifications}>",\n'
        f'  "event_type": "<one of: {valid_event_types}>",\n'
        '  "classification_score": <float 0.0-1.0>,\n'
        '  "ai_risk_score": <integer 1-9>,\n'
        '  "signal_flags": [<zero or more short alert strings>]\n'
        "}\n\n"
        "Rules:\n"
        "- error_classification MUST be exactly one of the listed values.\n"
        "- event_type MUST be exactly one of the listed values.\n"
        "- classification_score is your confidence (0.0 = uncertain, 1.0 = certain).\n"
        "- ai_risk_score is your overall risk assessment (1 = minimal, 9 = critical).\n"
        "- signal_flags is an empty list unless the incident warrants a specific alert "
        "(e.g. 'sentinel_event', 'repeat_pattern', 'patient_harm').\n"
        "- Return ONLY the JSON object. No additional text.\n\n"
        f"Incident description:\n{description}"
    )


# ── Response helpers ──────────────────────────────────────────────────────────

def _parse_ai_response(content: str) -> dict[str, Any] | None:
    """Extract and JSON-parse the LLM response body.

    Strips markdown code fences if the model wraps its output in them.
    Returns *None* if parsing fails for any reason.
    """
    content = content.strip()
    if content.startswith("```"):
        # Remove opening and closing fence lines (``` or ```json)
        lines = [ln for ln in content.splitlines() if not ln.startswith("```")]
        content = "\n".join(lines).strip()
    try:
        result = json.loads(content)
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        return None


def _build_ai_metadata(data: dict[str, Any]) -> AIMetadata:
    """Map a parsed AI response dict to a populated :class:`AIMetadata` instance.

    All values are validated and clamped to their permitted ranges so that
    malformed model output never propagates bad data into the stored document.
    """
    raw_classification = data.get("error_classification", "")
    auto_classification = raw_classification if raw_classification in _VALID_CLASSIFICATIONS else None

    raw_event_type = data.get("event_type", "")
    auto_event_type = raw_event_type if raw_event_type in _VALID_EVENT_TYPES else None

    raw_score = data.get("classification_score")
    try:
        classification_score: float | None = float(raw_score) if raw_score is not None else None
        if classification_score is not None:
            classification_score = max(0.0, min(1.0, classification_score))
    except (TypeError, ValueError):
        classification_score = None

    raw_risk = data.get("ai_risk_score")
    try:
        ai_risk_score: int | None = int(raw_risk) if raw_risk is not None else None
        if ai_risk_score is not None:
            ai_risk_score = max(1, min(9, ai_risk_score))
    except (TypeError, ValueError):
        ai_risk_score = None

    raw_flags = data.get("signal_flags", [])
    signal_flags = [str(f) for f in raw_flags] if isinstance(raw_flags, list) else []

    return AIMetadata(
        auto_classification=auto_classification,
        auto_event_type=auto_event_type,
        classification_score=classification_score,
        ai_risk_score=ai_risk_score,
        signal_flags=signal_flags,
        model_version=AI_MODEL or None,
        processed_at=datetime.now(tz=timezone.utc),
    )


# ── Provider adapters ─────────────────────────────────────────────────────────

async def _call_openai(prompt: str) -> dict[str, Any] | None:
    """POST to the OpenAI Chat Completions API and return the parsed JSON payload."""
    model = AI_MODEL or "gpt-4o-mini"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {AI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
            },
        )
        response.raise_for_status()
        payload = response.json()
        try:
            content: str = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            return None
        return _parse_ai_response(content)


async def _call_anthropic(prompt: str) -> dict[str, Any] | None:
    """POST to the Anthropic Messages API and return the parsed JSON payload."""
    model = AI_MODEL or "claude-3-haiku-20240307"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": AI_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        payload = response.json()
        try:
            content: str = payload["content"][0]["text"]
        except (KeyError, IndexError, TypeError):
            return None
        return _parse_ai_response(content)


async def _call_google(prompt: str) -> dict[str, Any] | None:
    """POST to the Google Generative Language API and return the parsed JSON payload."""
    model = AI_MODEL or "gemini-1.5-flash"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": AI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 512},
            },
        )
        response.raise_for_status()
        payload = response.json()
        try:
            content: str = payload["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            return None
        return _parse_ai_response(content)


# ── Public entry point ────────────────────────────────────────────────────────

async def classify_incident(description: str, facility_context: str) -> AIMetadata | None:
    """Classify an incident using the configured AI provider.

    This is the on-submit classification hook called inside ``incident_service``
    at the moment of recording — *before* the incident is saved to MongoDB.

    **Critical behaviour:**  Returns ``None`` immediately — without raising —
    whenever ``AI_PROVIDER`` is ``"none"`` or ``AI_API_KEY`` is blank.  This is
    intentional: the hook is wired in from day one but is dormant until a model
    is configured.  Any provider call failure or unparseable response also
    returns ``None`` silently so that incident creation is never blocked.

    Args:
        description:      Free-text incident description supplied by the reporter.
        facility_context: Short string identifying the facility (used as context).

    Returns:
        A populated :class:`~app.models.ai_metadata.AIMetadata` instance when
        AI is enabled and the provider responds successfully, otherwise ``None``.
    """
    if not _ENABLED:
        return None

    try:
        prompt = await get_classification_prompt(description, facility_context)

        data: dict[str, Any] | None = None
        if AI_PROVIDER == AIProvider.openai.value:
            data = await _call_openai(prompt)
        elif AI_PROVIDER == AIProvider.anthropic.value:
            data = await _call_anthropic(prompt)
        elif AI_PROVIDER == AIProvider.google.value:
            data = await _call_google(prompt)
        else:
            return None

        if data is None:
            return None

        return _build_ai_metadata(data)
    except Exception:  # noqa: BLE001
        # Intentionally broad: any network error, timeout, or unexpected provider
        # response must never propagate to the caller — incident creation must
        # always succeed regardless of AI availability.  KeyboardInterrupt and
        # SystemExit are NOT caught here because Exception does not cover them.
        return None
