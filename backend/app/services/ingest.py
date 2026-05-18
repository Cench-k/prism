"""수집 파이프라인 — CLI와 admin API에서 공유하는 핵심 로직."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from pymongo.errors import DuplicateKeyError

from app.collectors.factory import build_collector
from app.db.mongo import get_db, ensure_indexes
from app.services.summarizer import summarizer

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
SOURCES_PATH = ROOT / "config" / "sources.json"


def load_sources(category: str | None = None) -> list[dict]:
    data = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    sources = data.get("sources", [])
    if category:
        sources = [s for s in sources if s.get("category") == category]
    return sources


async def process_source(source: dict) -> tuple[int, int]:
    collector = build_collector(source)
    items = await collector.fetch()
    db = get_db()
    inserted = 0
    skipped = 0
    for item in items:
        existing = await db.articles.find_one({"url": item["url"]}, {"_id": 1})
        if existing:
            skipped += 1
            continue
        if summarizer.client:
            try:
                summary = await summarizer.summarize(
                    item["title"], item.get("content") or ""
                )
                if summary:
                    item["summary"] = summary
            except Exception as e:
                logger.warning("summary failed for %s: %s", item.get("url"), e)
        try:
            await db.articles.insert_one(item)
            inserted += 1
        except DuplicateKeyError:
            skipped += 1
    return inserted, skipped


async def run_ingest(category: str | None = None) -> dict:
    await ensure_indexes()
    sources = load_sources(category)
    results = []
    for src in sources:
        try:
            ins, skp = await process_source(src)
            results.append({"id": src["id"], "inserted": ins, "skipped": skp})
            logger.info("ingest %s inserted=%d skipped=%d", src["id"], ins, skp)
        except Exception as e:
            logger.exception("ingest failed for %s", src["id"])
            results.append({"id": src["id"], "error": str(e)})
    return {"sources": len(sources), "results": results}
