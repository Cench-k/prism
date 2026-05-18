"""사용자 키 기반 stateless 요약 서비스 (BYOK)."""

import json
import logging
from typing import Optional

from anthropic import AsyncAnthropic

from app.config import settings

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


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return text


async def summarize_with_key(
    api_key: str,
    title: str,
    content: str,
    model: Optional[str] = None,
) -> Optional[dict]:
    """주어진 키로 1회성 Claude 호출. 키는 호출 직후 폐기."""
    if not api_key:
        return None
    client = AsyncAnthropic(api_key=api_key)
    prompt = f"제목: {title}\n\n본문:\n{(content or '')[:3000]}"
    try:
        msg = await client.messages.create(
            model=model or settings.anthropic_model,
            max_tokens=400,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception:
        logger.exception("anthropic call failed")
        raise
    text = "".join(block.text for block in msg.content if block.type == "text")
    try:
        data = json.loads(_strip_code_fence(text))
    except json.JSONDecodeError:
        logger.warning("non-json summary response: %s", text[:200])
        return None
    headline = str(data.get("headline", "")).strip()
    background = str(data.get("background", "")).strip()
    if not headline or not background:
        return None
    return {"headline": headline, "background": background}
