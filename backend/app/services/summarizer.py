"""다중 provider 요약 디스패처 (Anthropic / OpenAI / Gemini). 키는 사용 직후 폐기."""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

_SYSTEM = (
    "당신은 한국어 뉴스 매거진 편집자입니다. "
    "주어진 기사 제목과 본문을 읽고, 한국어 독자 관점에서 "
    "핵심을 압축한 JSON을 반환하세요. "
    "반드시 다음 키만 포함된 JSON만 응답하세요: "
    '{"headline": "...", "background": "..."}. '
    "headline은 핵심 결론 1줄(최대 60자), "
    "background는 배경과 전망 2줄 요약(최대 160자)입니다."
)


DEFAULT_MODELS: dict[str, str] = {
    "anthropic": "claude-haiku-4-5-20251001",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-2.5-flash",
}


def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return text


def _parse(text: str) -> Optional[dict]:
    try:
        data = json.loads(_strip_fence(text))
    except json.JSONDecodeError:
        logger.warning("non-json summary response: %s", text[:200])
        return None
    headline = str(data.get("headline", "")).strip()
    background = str(data.get("background", "")).strip()
    if not headline or not background:
        return None
    return {"headline": headline, "background": background}


def _build_prompt(title: str, content: str) -> str:
    return f"제목: {title}\n\n본문:\n{(content or '')[:3000]}"


async def _anthropic(api_key: str, model: str, title: str, content: str) -> Optional[dict]:
    client = AsyncAnthropic(api_key=api_key)
    msg = await client.messages.create(
        model=model,
        max_tokens=400,
        system=_SYSTEM,
        messages=[{"role": "user", "content": _build_prompt(title, content)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return _parse(text)


async def _openai(api_key: str, model: str, title: str, content: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": _build_prompt(title, content)},
                ],
                "response_format": {"type": "json_object"},
                "max_tokens": 400,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    text = data["choices"][0]["message"]["content"]
    return _parse(text)


async def _gemini(api_key: str, model: str, title: str, content: str) -> Optional[dict]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json={
                "contents": [
                    {"role": "user", "parts": [{"text": _build_prompt(title, content)}]}
                ],
                "systemInstruction": {"parts": [{"text": _SYSTEM}]},
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "maxOutputTokens": 400,
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts)
    return _parse(text)


_PROVIDERS = {
    "anthropic": _anthropic,
    "openai": _openai,
    "gemini": _gemini,
}


class ProviderError(Exception):
    """provider 자체 오류 (잘못된 키, rate limit, upstream)."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


_MODEL_NOT_FOUND_HINTS = (
    "model not found",
    "invalid model",
    "does not exist",
    "no such model",
    "not_found_error",
    "model_not_found",
    "is not supported",
)


def _is_model_not_found(msg: str) -> bool:
    low = msg.lower()
    return any(h in low for h in _MODEL_NOT_FOUND_HINTS) or (
        "model" in low and "not found" in low
    )


_RATE_LIMIT_HINTS = ("rate_limit", "quota", "429", "too many requests", "exceeded")


def _is_rate_limit(msg: str) -> bool:
    low = msg.lower()
    return any(h in low for h in _RATE_LIMIT_HINTS)


async def summarize(
    provider: str,
    api_key: str,
    title: str,
    content: str,
    model: Optional[str] = None,
) -> Optional[dict]:
    fn = _PROVIDERS.get(provider)
    if fn is None:
        raise ProviderError(400, f"unsupported provider: {provider}")
    if not api_key:
        raise ProviderError(401, "missing api key")
    chosen_model = model or DEFAULT_MODELS[provider]
    try:
        return await fn(api_key, chosen_model, title, content)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        body = e.response.text[:400]
        if status in (401, 403):
            raise ProviderError(
                401, "API 키가 유효하지 않거나 권한이 없습니다. 설정에서 키를 확인해주세요."
            ) from e
        if status == 404 or _is_model_not_found(body):
            raise ProviderError(
                400,
                f"'{chosen_model}' 모델을 찾을 수 없습니다. 설정에서 다른 모델을 선택하거나 비워두세요(기본값 사용).",
            ) from e
        if status == 429 or _is_rate_limit(body):
            raise ProviderError(
                429, f"{provider} 사용 한도를 초과했거나 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요."
            ) from e
        raise ProviderError(502, f"{provider} 오류 ({status}): {body}") from e
    except httpx.HTTPError as e:
        raise ProviderError(502, f"{provider} 네트워크 오류: {e}") from e
    except Exception as e:
        # anthropic SDK 등에서 던지는 예외는 메시지로 분류
        msg = str(e)
        if "401" in msg or "authentication" in msg.lower():
            raise ProviderError(
                401, "API 키가 유효하지 않거나 권한이 없습니다. 설정에서 키를 확인해주세요."
            ) from e
        if _is_model_not_found(msg):
            raise ProviderError(
                400,
                f"'{chosen_model}' 모델을 찾을 수 없습니다. 설정에서 다른 모델을 선택하거나 비워두세요(기본값 사용).",
            ) from e
        if _is_rate_limit(msg):
            raise ProviderError(
                429, f"{provider} 사용 한도를 초과했거나 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요."
            ) from e
        raise ProviderError(502, f"{provider} 오류: {msg}") from e
