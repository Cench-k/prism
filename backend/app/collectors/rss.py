from datetime import datetime, timezone
from time import mktime
from typing import Any

import feedparser
import httpx
from bs4 import BeautifulSoup

from app.collectors.base import BaseCollector


def _extract_image(entry: dict[str, Any], summary_html: str) -> str | None:
    media = entry.get("media_content") or entry.get("media_thumbnail")
    if media and isinstance(media, list) and media[0].get("url"):
        return media[0]["url"]
    if entry.get("enclosures"):
        for enc in entry["enclosures"]:
            if str(enc.get("type", "")).startswith("image"):
                return enc.get("href") or enc.get("url")
    if summary_html:
        soup = BeautifulSoup(summary_html, "lxml")
        img = soup.find("img")
        if img and img.get("src"):
            return img["src"]
    return None


def _parse_published(entry: dict[str, Any]) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        if entry.get(key):
            return datetime.fromtimestamp(mktime(entry[key]), tz=timezone.utc)
    return None


def _clean_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    return soup.get_text(" ", strip=True)


class RSSCollector(BaseCollector):
    async def fetch(self) -> list[dict[str, Any]]:
        url = self.source["url"]
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "PrismBot/0.1"})
            resp.raise_for_status()
            raw = resp.content

        feed = feedparser.parse(raw)
        items: list[dict[str, Any]] = []
        for entry in feed.entries:
            link = entry.get("link")
            title = entry.get("title")
            if not link or not title:
                continue
            summary_html = entry.get("summary") or entry.get("description") or ""
            items.append(
                {
                    "source_id": self.source_id,
                    "category": self.category,
                    "subcategory": self.subcategory,
                    "lang": self.lang,
                    "title": title.strip(),
                    "url": link.strip(),
                    "image_url": _extract_image(entry, summary_html),
                    "content": _clean_text(summary_html),
                    "published_at": _parse_published(entry),
                    "collected_at": datetime.now(timezone.utc),
                    "meta_data": {},
                }
            )
        return items
