import json

from anthropic.types.message_param import MessageParam
from fastapi import Depends
from loguru import logger
from redis.asyncio import Redis

from agent.constants import REDIS_URL
from agent.errors import RedisNotReadyError

REDIS_CLIENT: Redis = Redis.from_url(REDIS_URL, decode_responses=True)


SESSION_KEY = "agent:session:{session_id}"
DISPLAY_KEY = "agent:session:{session_id}:display"


async def redis_ok() -> bool:
    """Check whether Redis is reachable."""
    try:
        return await REDIS_CLIENT.ping()  # ty: ignore[invalid-await]
    except ConnectionError:
        logger.warning("Redis ping failed")
        return False


async def load_messages(
    session_id: str,
    redis_ready: bool = Depends(redis_ok),
) -> list[MessageParam]:
    """Load conversation messages for a session from Redis."""
    if not redis_ready:
        raise RedisNotReadyError()
    data = await REDIS_CLIENT.get(SESSION_KEY.format(session_id=session_id))
    messages: list[MessageParam] = json.loads(data) if data else []
    logger.debug("Loaded {n} messages", n=len(messages))
    return messages


async def save_messages(
    session_id: str,
    messages: list[MessageParam],
    redis_ready: bool = Depends(redis_ok),
) -> None:
    """Persist conversation messages for a session to Redis."""
    if not redis_ready:
        raise RedisNotReadyError()
    key = SESSION_KEY.format(session_id=session_id)
    await REDIS_CLIENT.set(key, json.dumps(messages, default=str))
    logger.debug("Saved {n} messages", n=len(messages))


async def load_display_messages(
    session_id: str,
    redis_ready: bool = Depends(redis_ok),
) -> list[dict[str, str]]:
    """Load display messages (simple role/content pairs) for the frontend."""
    if not redis_ready:
        raise RedisNotReadyError()
    data = await REDIS_CLIENT.get(DISPLAY_KEY.format(session_id=session_id))
    messages: list[dict[str, str]] = json.loads(data) if data else []
    logger.debug("Loaded {n} display messages", n=len(messages))
    return messages


async def save_display_messages(
    session_id: str,
    messages: list[dict[str, str]],
    redis_ready: bool = Depends(redis_ok),
) -> None:
    """Persist display messages for the frontend."""
    if not redis_ready:
        raise RedisNotReadyError()
    key = DISPLAY_KEY.format(session_id=session_id)
    await REDIS_CLIENT.set(key, json.dumps(messages))
    logger.debug("Saved {n} display messages", n=len(messages))
