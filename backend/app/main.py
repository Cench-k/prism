from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.mongo import ensure_indexes
from app.api.articles import router as articles_router
from app.api.admin import router as admin_router
from app.api.llm import router as llm_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(title="Prism API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(llm_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
