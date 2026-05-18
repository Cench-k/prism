"""카드뉴스 슬라이드 생성 - 3 provider 디스패처."""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from anthropic import AsyncAnthropic

from app.services.summarizer import (
    DEFAULT_MODELS,
    ProviderError,
    _is_model_not_found,
    _is_rate_limit,
)

logger = logging.getLogger(__name__)


_SYSTEM = (
    "당신은 한국어 인스타그램 카드뉴스 편집자입니다. "
    "주어진 기사를 5장의 정사각형 캐러셀 슬라이드로 분해하세요. "
    "독자가 짧은 시간에 핵심을 파악할 수 있게 간결하고 임팩트 있게 작성합니다. "
    "반드시 다음 JSON 스키마만 반환하세요 (다른 텍스트, 코드펜스 금지):\n"
    "{\n"
    '  "slides": [\n'
    '    {"type": "cover", "title": "...(최대 30자, 강한 한 줄)", "subtitle": "...(최대 50자, 보조 설명)"},\n'
    '    {"type": "context", "body": "...(최대 100자, 왜 지금 중요한지)"},\n'
    '    {"type": "point", "heading": "...(최대 18자)", "body": "...(최대 110자)"},\n'
    '    {"type": "point", "heading": "...(최대 18자)", "body": "...(최대 110자)"},\n'
    '    {"type": "outro", "headline": "...(최대 40자, 핵심 결론)", "cta": "PRISM"}\n'
    "  ]\n"
    "}"
)


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
        logger.warning("non-json cardnews response: %s", text[:200])
        return None
    slides = data.get("slides")
    if not isinstance(slides, list) or len(slides) < 3:
        return None
    cleaned: list[dict] = []
    for s in slides:
        if not isinstance(s, dict):
            continue
        t = s.get("type")
        if t not in {"cover", "context", "point", "outro"}:
            continue
        cleaned.append({k: ("" if v is None else str(v)) for k, v in s.items()})
    if len(cleaned) < 3:
        return None
    return {"slides": cleaned}


def _prompt(title: str, content: str) -> str:
    return f"기사 제목: {title}\n\n기사 본문:\n{(content or '')[:3500]}"


async def _anthropic(api_key: str, model: str, title: str, content: str) -> Optional[dict]:
    client = AsyncAnthropic(api_key=api_key)
    msg = await client.messages.create(
        model=model,
        max_tokens=1200,
        system=_SYSTEM,
        messages=[{"role": "user", "content": _prompt(title, content)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return _parse(text)


async def _openai(api_key: str, model: str, title: str, content: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": _prompt(title, content)},
                ],
                "response_format": {"type": "json_object"},
                "max_tokens": 1200,
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
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            url,
            json={
                "contents": [
                    {"role": "user", "parts": [{"text": _prompt(title, content)}]}
                ],
                "systemInstruction": {"parts": [{"text": _SYSTEM}]},
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "maxOutputTokens": 1200,
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


async def generate_cardnews(
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
                401, "API 키가 유효하지 않거나 권한이 없습니다."
            ) from e
        if status == 404 or _is_model_not_found(body):
            raise ProviderError(
                400,
                f"'{chosen_model}' 모델을 찾을 수 없습니다. 설정에서 다른 모델을 선택하세요.",
            ) from e
        if status == 429 or _is_rate_limit(body):
            raise ProviderError(
                429, f"{provider} 사용 한도 초과. 잠시 후 다시 시도해주세요."
            ) from e
        raise ProviderError(502, f"{provider} 오류 ({status}): {body}") from e
    except httpx.HTTPError as e:
        raise ProviderError(502, f"{provider} 네트워크 오류: {e}") from e
    except Exception as e:
        msg = str(e)
        if "401" in msg or "authentication" in msg.lower():
            raise ProviderError(401, "API 키가 유효하지 않습니다.") from e
        if _is_model_not_found(msg):
            raise ProviderError(
                400, f"'{chosen_model}' 모델을 찾을 수 없습니다."
            ) from e
        if _is_rate_limit(msg):
            raise ProviderError(429, f"{provider} 사용 한도 초과.") from e
        raise ProviderError(502, f"{provider} 오류: {msg}") from e
