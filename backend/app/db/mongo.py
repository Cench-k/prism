from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongo_db]


async def ensure_indexes() -> None:
    db = get_db()
    await db.articles.create_index("url", unique=True)
    await db.articles.create_index([("category", 1), ("published_at", -1)])
    try:
        await db.articles.drop_index("collected_at_1")
    except Exception:
        pass
    await db.articles.create_index("collected_at", expireAfterSeconds=172800)
