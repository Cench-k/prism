from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class Summary(BaseModel):
    headline: str = Field(description="핵심 1줄 결론")
    background: str = Field(description="배경과 전망 2줄 요약")


class Article(BaseModel):
    id: str = Field(alias="_id")
    source_id: str
    category: str
    subcategory: Optional[str] = None
    lang: str = "en"
    title: str
    url: str
    image_url: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[Summary] = None
    meta_data: dict[str, Any] = Field(default_factory=dict)
    published_at: Optional[datetime] = None
    collected_at: datetime

    model_config = {"populate_by_name": True}


class ArticleListResponse(BaseModel):
    items: list[Article]
    total: int
