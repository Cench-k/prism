from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from typing import Optional

from app.config import settings
from app.services.ingest import run_ingest

router = APIRouter()


def _check_token(token: Optional[str]) -> None:
    if not settings.ingest_token:
        raise HTTPException(status_code=503, detail="ingest disabled (no token set)")
    if token != settings.ingest_token:
        raise HTTPException(status_code=401, detail="invalid token")


@router.post("/admin/ingest")
async def trigger_ingest(
    background: BackgroundTasks,
    category: Optional[str] = None,
    x_ingest_token: Optional[str] = Header(default=None, alias="X-Ingest-Token"),
):
    _check_token(x_ingest_token)
    background.add_task(run_ingest, category)
    return {"queued": True, "category": category}


@router.post("/admin/ingest/sync")
async def trigger_ingest_sync(
    category: Optional[str] = None,
    x_ingest_token: Optional[str] = Header(default=None, alias="X-Ingest-Token"),
):
    """장시간 트리거가 가능한 환경(GitHub Actions 등)에서 결과까지 받고 싶을 때."""
    _check_token(x_ingest_token)
    return await run_ingest(category)
