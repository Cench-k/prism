from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Header
from anthropic import APIStatusError, APIConnectionError, AuthenticationError

from app.db.mongo import get_db
from app.services.market import fetch_crypto_tickers
from app.services.summarizer import summarize_with_key

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


@router.post("/articles/{article_id}/summarize")
async def summarize_article(
    article_id: str,
    x_anthropic_key: Optional[str] = Header(default=None, alias="X-Anthropic-Key"),
):
    """사용자 키로 1회성 요약. 기존 summary가 있으면 그대로 반환(공유 캐시)."""
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

    if not x_anthropic_key:
        raise HTTPException(
            status_code=401,
            detail="missing X-Anthropic-Key header — set your key in Settings",
        )

    try:
        summary = await summarize_with_key(
            x_anthropic_key,
            doc.get("title", ""),
            doc.get("content") or "",
        )
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="invalid Anthropic API key")
    except (APIStatusError, APIConnectionError) as e:
        raise HTTPException(status_code=502, detail=f"anthropic upstream: {e}")

    if not summary:
        raise HTTPException(status_code=502, detail="failed to parse summary")

    await db.articles.update_one({"_id": oid}, {"$set": {"summary": summary}})
    return {"summary": summary, "cached": False}
