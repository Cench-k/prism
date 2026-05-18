"""Provider별 모델 목록 fetch — 사용자 키로 실시간 조회."""

from __future__ import annotations

import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class CatalogError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def _classify_http_error(provider: str, status: int, body: str) -> CatalogError:
    if status in (401, 403):
        return CatalogError(401, "API 키가 유효하지 않거나 권한이 없습니다.")
    if status == 429:
        return CatalogError(
            429, f"{provider} 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
        )
    return CatalogError(502, f"{provider} 오류 ({status}): {body[:200]}")


# Anthropic ---------------------------------------------------------------

async def _list_anthropic(api_key: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.anthropic.com/v1/models",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )
    if resp.status_code != 200:
        raise _classify_http_error("anthropic", resp.status_code, resp.text)
    data = resp.json().get("data", []) or []
    out: list[dict] = []
    for item in data:
        model_id = item.get("id")
        if not model_id:
            continue
        out.append(
            {
                "id": model_id,
                "label": item.get("display_name") or model_id,
            }
        )
    return out


# OpenAI ------------------------------------------------------------------

_OPENAI_CHAT_PATTERN = re.compile(r"^(gpt-|o\d|chatgpt-|gpt$)", re.IGNORECASE)
_OPENAI_EXCLUDE_PATTERN = re.compile(
    r"(embedding|whisper|tts|audio|realtime|moderation|dall-e|image|search-|"
    r"transcribe|computer-use|babbage|davinci|curie|ada|instruct)",
    re.IGNORECASE,
)


def _is_openai_chat_model(model_id: str) -> bool:
    if _OPENAI_EXCLUDE_PATTERN.search(model_id):
        return False
    return bool(_OPENAI_CHAT_PATTERN.match(model_id))


async def _list_openai(api_key: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
    if resp.status_code != 200:
        raise _classify_http_error("openai", resp.status_code, resp.text)
    data = resp.json().get("data", []) or []
    out: list[dict] = []
    for item in data:
        model_id = item.get("id")
        if not model_id or not _is_openai_chat_model(model_id):
            continue
        out.append({"id": model_id, "label": model_id})
    # 알파벳 역순(주로 mini/최신이 위에 오게)
    out.sort(key=lambda m: m["id"], reverse=False)
    return out


# Gemini ------------------------------------------------------------------

async def _list_gemini(api_key: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": api_key},
        )
    if resp.status_code != 200:
        raise _classify_http_error("gemini", resp.status_code, resp.text)
    data = resp.json().get("models", []) or []
    out: list[dict] = []
    for item in data:
        name = item.get("name", "")
        # name 형식: "models/gemini-2.5-flash"
        if not name.startswith("models/"):
            continue
        model_id = name[len("models/") :]
        methods = item.get("supportedGenerationMethods") or []
        if "generateContent" not in methods:
            continue
        out.append(
            {
                "id": model_id,
                "label": item.get("displayName") or model_id,
            }
        )
    return out


_FETCHERS = {
    "anthropic": _list_anthropic,
    "openai": _list_openai,
    "gemini": _list_gemini,
}


async def list_models(provider: str, api_key: str) -> list[dict]:
    fn = _FETCHERS.get(provider)
    if fn is None:
        raise CatalogError(400, f"unsupported provider: {provider}")
    if not api_key:
        raise CatalogError(401, "missing api key")
    try:
        return await fn(api_key)
    except CatalogError:
        raise
    except httpx.HTTPError as e:
        raise CatalogError(502, f"{provider} 네트워크 오류: {e}") from e
    except Exception as e:
        raise CatalogError(502, f"{provider} 오류: {e}") from e
