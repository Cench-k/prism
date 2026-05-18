import json
from anthropic import AsyncAnthropic
from app.config import settings

_SYSTEM = (
    "당신은 한국어 뉴스 매거진 편집자입니다. "
    "주어진 기사 제목과 본문을 읽고, 한국어 독자 관점에서 "
    "핵심을 압축한 JSON을 반환하세요. "
    "반드시 다음 키만 포함된 JSON만 응답하세요: "
    '{"headline": "...", "background": "..."}. '
    "headline은 핵심 결론 1줄(최대 60자), "
    "background는 배경과 전망 2줄 요약(최대 160자)입니다."
)


class Summarizer:
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            self.client = None
        else:
            self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.anthropic_model

    async def summarize(self, title: str, content: str) -> dict[str, str] | None:
        if not self.client:
            return None
        prompt = f"제목: {title}\n\n본문:\n{content[:3000]}"
        msg = await self.client.messages.create(
            model=self.model,
            max_tokens=400,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(block.text for block in msg.content if block.type == "text").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return None
        headline = str(data.get("headline", "")).strip()
        background = str(data.get("background", "")).strip()
        if not headline or not background:
            return None
        return {"headline": headline, "background": background}


summarizer = Summarizer()
