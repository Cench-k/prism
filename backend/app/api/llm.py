from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from app.services.llm_catalog import list_models, CatalogError

router = APIRouter()

_ALLOWED_PROVIDERS = {"anthropic", "openai", "gemini"}


@router.get("/llm/models")
async def llm_models(
    x_ai_provider: Optional[str] = Header(default=None, alias="X-AI-Provider"),
    x_ai_key: Optional[str] = Header(default=None, alias="X-AI-Key"),
):
    """사용자 키로 provider의 모델 목록을 조회. 키는 호출 직후 폐기."""
    provider = (x_ai_provider or "").lower().strip()
    if provider not in _ALLOWED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"X-AI-Provider must be one of {sorted(_ALLOWED_PROVIDERS)}",
        )
    if not x_ai_key:
        raise HTTPException(status_code=401, detail="missing X-AI-Key header")
    try:
        models = await list_models(provider, x_ai_key)
    except CatalogError as e:
        raise HTTPException(status_code=e.status, detail=e.message)
    return {"provider": provider, "models": models}
