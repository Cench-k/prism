from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Header

from app.db.mongo import get_db
from app.services.market import fetch_crypto_tickers
from app.services.summarizer import summarize, ProviderError

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/articles")
async def list_articles(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: Optional[str] = Query(default=None, description="last collected_at ISO"),
):
    db = get_db()
    query: dict = {}
    if category:
        query["category"] = category
    if cursor:
        from datetime import datetime
        try:
            ts = datetime.fromisoformat(cursor)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid cursor")
        query["collected_at"] = {"$lt": ts}

    cursor_docs = (
        db.articles.find(query)
        .sort("collected_at", -1)
        .limit(limit)
    )
    docs = [_serialize(d) async for d in cursor_docs]
    next_cursor = None
    if docs and len(docs) == limit:
        next_cursor = docs[-1]["collected_at"].isoformat()
    return {"items": docs, "next_cursor": next_cursor}


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(article_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid id")
    doc = await db.articles.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="not found")
    return _serialize(doc)


@router.get("/widgets/crypto")
async def crypto_widget():
    try:
        tickers = await fetch_crypto_tickers()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"upstream error: {e}")
    return {"tickers": tickers}


_ALLOWED_PROVIDERS = {"anthropic", "openai", "gemini"}


@router.post("/articles/{article_id}/summarize")
async def summarize_article(
    article_id: str,
    x_ai_provider: Optional[str] = Header(default=None, alias="X-AI-Provider"),
    x_ai_key: Optional[str] = Header(default=None, alias="X-AI-Key"),
    x_ai_model: Optional[str] = Header(default=None, alias="X-AI-Model"),
):
    """사용자 키 + provider 선택으로 요약. 결과는 DB에 캐시(전 사용자 공유)."""
    from bson import ObjectId

    db = get_db()
    try:
        oid = ObjectId(article_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid id")

    doc = await db.articles.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="not found")

    if doc.get("summary"):
        return {"summary": doc["summary"], "cached": True}

    provider = (x_ai_provider or "").lower().strip()
    if provider not in _ALLOWED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"X-AI-Provider must be one of {sorted(_ALLOWED_PROVIDERS)}",
        )
    if not x_ai_key:
        raise HTTPException(
            status_code=401,
            detail="missing X-AI-Key header — set your key in Settings",
        )

    try:
        summary = await summarize(
            provider=provider,
            api_key=x_ai_key,
            title=doc.get("title", ""),
            content=doc.get("content") or "",
            model=x_ai_model or None,
        )
    except ProviderError as e:
        raise HTTPException(status_code=e.status, detail=e.message)

    if not summary:
        raise HTTPException(status_code=502, detail="failed to parse summary response")

    await db.articles.update_one(
        {"_id": oid},
        {"$set": {"summary": summary, "summary_meta": {"provider": provider}}},
    )
    return {"summary": summary, "cached": False}
