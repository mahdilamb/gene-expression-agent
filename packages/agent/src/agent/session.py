import json
from typing import Any

from loguru import logger
from redis.asyncio import Redis

from agent.constants import REDIS_URL

_redis: Redis = Redis.from_url(REDIS_URL, decode_responses=True)


def _key(session_id: str) -> str:
    return f"agent:session:{session_id}"


def _display_key(session_id: str) -> str:
    return f"agent:session:{session_id}:display"


async def load_messages(session_id: str) -> list[dict[str, Any]]:
    """Load conversation messages for a session from Redis."""
    data = await _redis.get(_key(session_id))
    messages: list[dict[str, Any]] = json.loads(data) if data else []
    logger.debug("Loaded {n} messages", n=len(messages))
    return messages


async def save_messages(session_id: str, messages: list[dict[str, Any]]) -> None:
    """Persist conversation messages for a session to Redis."""
    await _redis.set(_key(session_id), json.dumps(messages, default=str))
    logger.debug("Saved {n} messages", n=len(messages))


async def load_display_messages(session_id: str) -> list[dict[str, str]]:
    """Load display messages (simple role/content pairs) for the frontend."""
    data = await _redis.get(_display_key(session_id))
    messages: list[dict[str, str]] = json.loads(data) if data else []
    logger.debug("Loaded {n} display messages", n=len(messages))
    return messages


async def save_display_messages(
    session_id: str, messages: list[dict[str, str]]
) -> None:
    """Persist display messages for the frontend."""
    await _redis.set(_display_key(session_id), json.dumps(messages))
    logger.debug("Saved {n} display messages", n=len(messages))


async def redis_ok() -> bool:
    """Check whether Redis is reachable."""
    try:
        return await _redis.ping()  # ty: ignore[invalid-await]
    except ConnectionError:
        logger.warning("Redis ping failed")
        return False
