from typing import Any
from app.collectors.base import BaseCollector
from app.collectors.rss import RSSCollector


_REGISTRY: dict[str, type[BaseCollector]] = {
    "rss": RSSCollector,
}


def build_collector(source: dict[str, Any]) -> BaseCollector:
    kind = source.get("type")
    cls = _REGISTRY.get(kind)
    if cls is None:
        raise ValueError(f"Unsupported collector type: {kind}")
    return cls(source)
