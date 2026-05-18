from abc import ABC, abstractmethod
from typing import Any


class BaseCollector(ABC):
    def __init__(self, source: dict[str, Any]) -> None:
        self.source = source

    @property
    def source_id(self) -> str:
        return self.source["id"]

    @property
    def category(self) -> str:
        return self.source["category"]

    @property
    def subcategory(self) -> str | None:
        return self.source.get("subcategory")

    @property
    def lang(self) -> str:
        return self.source.get("lang", "en")

    @abstractmethod
    async def fetch(self) -> list[dict[str, Any]]:
        """Return list of normalized article dicts."""
        ...
