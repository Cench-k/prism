import logging
from datetime import timedelta

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

# 영구 보존 카테고리 — TTL 적용 안 됨
PERMANENT_CATEGORIES = {"jp_mystery"}
TTL_HOURS = 48

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongo_db]


async def ensure_indexes() -> None:
    """기본 인덱스와 archive_until 기반 부분 TTL 인덱스를 보장.

    설계:
    - 일반 카테고리 기사: 수집 시 archive_until = collected_at + 48h 로 세팅됨
    - 영구 카테고리 기사: archive_until 미설정 (TTL 비대상)
    - TTL 인덱스는 partialFilterExpression으로 archive_until 있는 문서에만 적용
    """
    db = get_db()
    await db.articles.create_index("url", unique=True)
    await db.articles.create_index([("category", 1), ("published_at", -1)])

    # 이전 단계의 collected_at TTL은 더 이상 필요 없음
    for stale in ("collected_at_1",):
        try:
            await db.articles.drop_index(stale)
        except Exception:
            pass

    # archive_until 기반 TTL — 필드가 있는 문서만 만료 대상
    await db.articles.create_index(
        "archive_until",
        expireAfterSeconds=0,
        partialFilterExpression={"archive_until": {"$type": "date"}},
        name="archive_until_ttl",
    )

    # collected_at 자체는 정렬·페이지네이션용으로 유지 (TTL 없는 일반 인덱스)
    await db.articles.create_index([("collected_at", -1)], name="collected_at_sort")

    # 기존 데이터 백필: archive_until이 없는 일반 카테고리 기사에 한 번에 세팅
    try:
        result = await db.articles.update_many(
            {
                "archive_until": {"$exists": False},
                "category": {"$nin": list(PERMANENT_CATEGORIES)},
            },
            [
                {
                    "$set": {
                        "archive_until": {
                            "$add": [
                                "$collected_at",
                                int(timedelta(hours=TTL_HOURS).total_seconds()) * 1000,
                            ]
                        }
                    }
                }
            ],
        )
        if result.modified_count:
            logger.info(
                "backfilled archive_until for %d existing articles",
                result.modified_count,
            )
    except Exception:
        logger.exception("archive_until backfill failed")
