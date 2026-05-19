from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Header

from app.db.mongo import get_db
from app.services.market import fetch_crypto_tickers
from app.services.summarizer import summarize, ProviderError
from app.services.cardnews import generate_cardnews

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


DEFAULT_LOOKBACK_DAYS = 2


def _lookback_filter(days: int) -> dict:
    """발행일(published_at) 기준 N일 이내. published_at이 없으면 collected_at 대체."""
    from datetime import datetime, timezone, timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return {
        "$or": [
            {"published_at": {"$gte": cutoff}},
            {
                "published_at": {"$in": [None]},
                "collected_at": {"$gte": cutoff},
            },
        ]
    }


@router.get("/articles")
async def list_articles(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: Optional[str] = Query(default=None, description="last collected_at ISO"),
    days: int = Query(default=DEFAULT_LOOKBACK_DAYS, ge=1, le=30),
):
    from datetime import datetime

    db = get_db()
    base: dict = _lookback_filter(days)
    if category:
        base["category"] = category

    if cursor:
        try:
            ts = datetime.fromisoformat(cursor)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid cursor")
        query: dict = {"$and": [base, {"collected_at": {"$lt": ts}}]}
    else:
        query = base

    cursor_docs = (
        db.articles.find(query).sort("collected_at", -1).limit(limit)
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


@router.get("/categories")
async def list_categories(
    days: int = Query(default=DEFAULT_LOOKBACK_DAYS, ge=1, le=30),
):
    """최근 N일 이내 기사가 있는 카테고리 목록 + 카운트."""
    db = get_db()
    pipeline = [
        {"$match": _lookback_filter(days)},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    items: list[dict] = []
    async for doc in db.articles.aggregate(pipeline):
        cat = doc.get("_id")
        if not cat:
            continue
        items.append({"id": cat, "count": doc["count"]})
    return {"items": items}


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


@router.post("/articles/{article_id}/cardnews")
async def article_cardnews(
    article_id: str,
    regenerate: bool = False,
    x_ai_provider: Optional[str] = Header(default=None, alias="X-AI-Provider"),
    x_ai_key: Optional[str] = Header(default=None, alias="X-AI-Key"),
    x_ai_model: Optional[str] = Header(default=None, alias="X-AI-Model"),
):
    """기사를 5장 카드뉴스 슬라이드 JSON으로 변환. 결과는 DB에 캐시(공유)."""
    from bson import ObjectId

    db = get_db()
    try:
        oid = ObjectId(article_id)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid id")

    doc = await db.articles.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="not found")

    if not regenerate and doc.get("cardnews"):
        return {"cardnews": doc["cardnews"], "cached": True}

    provider = (x_ai_provider or "").lower().strip()
    if provider not in _ALLOWED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"X-AI-Provider must be one of {sorted(_ALLOWED_PROVIDERS)}",
        )
    if not x_ai_key:
        raise HTTPException(
            status_code=401, detail="missing X-AI-Key header"
        )

    title = doc.get("title", "")
    content = doc.get("content") or ""
    if len(content.strip()) < 30:
        raise HTTPException(
            status_code=422,
            detail="기사 본문이 너무 짧아 카드뉴스를 생성할 수 없습니다. 본문이 있는 다른 기사를 선택해 주세요.",
        )

    try:
        result = await generate_cardnews(
            provider=provider,
            api_key=x_ai_key,
            title=title,
            content=content,
            model=x_ai_model or None,
        )
    except ProviderError as e:
        raise HTTPException(status_code=e.status, detail=e.message)

    if not result:
        raise HTTPException(
            status_code=502,
            detail="AI 응답을 슬라이드로 변환하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        )

    await db.articles.update_one(
        {"_id": oid},
        {"$set": {"cardnews": result, "cardnews_meta": {"provider": provider}}},
    )
    return {"cardnews": result, "cached": False}
