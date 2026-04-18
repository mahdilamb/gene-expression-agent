import json
from typing import Any

from anthropic.types.message_param import MessageParam
from fastapi import Depends
from loguru import logger
from redis.asyncio import Redis

from agent.constants import REDIS_URL
from agent.errors import RedisNotReadyError
from agent.types import DisplayMessage

REDIS_CLIENT: Redis = Redis.from_url(REDIS_URL, decode_responses=True)


SESSION_KEY = "agent:session:{session_id}"
DISPLAY_KEY = "agent:session:{session_id}:display"
PARENT_KEY = "agent:session:{session_id}:parent"
CHILDREN_KEY = "agent:session:{session_id}:children"
META_KEY = "agent:session:{session_id}:meta"


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
) -> list[DisplayMessage]:
    """Load display messages for the frontend."""
    if not redis_ready:
        raise RedisNotReadyError()
    data = await REDIS_CLIENT.get(DISPLAY_KEY.format(session_id=session_id))
    raw: list[dict[str, Any]] = json.loads(data) if data else []
    messages = [DisplayMessage(**m) for m in raw]
    logger.debug("Loaded {n} display messages", n=len(messages))
    return messages


async def save_display_messages(
    session_id: str,
    messages: list[DisplayMessage],
    redis_ready: bool = Depends(redis_ok),
) -> None:
    """Persist display messages for the frontend."""
    if not redis_ready:
        raise RedisNotReadyError()
    key = DISPLAY_KEY.format(session_id=session_id)
    await REDIS_CLIENT.set(key, json.dumps([m.model_dump() for m in messages]))
    logger.debug("Saved {n} display messages", n=len(messages))


async def set_parent(
    child_id: str,
    parent_id: str,
    meta: dict[str, Any] | None = None,
) -> None:
    """Link a child session to its parent."""
    await REDIS_CLIENT.set(PARENT_KEY.format(session_id=child_id), parent_id)
    await REDIS_CLIENT.sadd(  # ty: ignore[invalid-await]
        CHILDREN_KEY.format(session_id=parent_id), child_id
    )
    if meta:
        await REDIS_CLIENT.set(META_KEY.format(session_id=child_id), json.dumps(meta))
    logger.debug(
        "Linked child {child} -> parent {parent}",
        child=child_id,
        parent=parent_id,
    )


async def get_parent(session_id: str) -> str | None:
    """Return the parent session id, or None if this is a root session."""
    return await REDIS_CLIENT.get(PARENT_KEY.format(session_id=session_id))


async def list_children(session_id: str) -> list[dict[str, Any]]:
    """Return the child thread ids and their metadata for a session."""
    children_ids: set[str] = await REDIS_CLIENT.smembers(  # ty: ignore[invalid-await]
        CHILDREN_KEY.format(session_id=session_id)
    )
    results: list[dict[str, Any]] = []
    for child_id in sorted(children_ids):
        meta_raw = await REDIS_CLIENT.get(META_KEY.format(session_id=child_id))
        meta = json.loads(meta_raw) if meta_raw else {}
        results.append({"thread_id": child_id, **meta})
    return results
