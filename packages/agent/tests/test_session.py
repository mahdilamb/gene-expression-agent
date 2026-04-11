import json

import pytest
from redis.asyncio import Redis

from agent.session import (
    DISPLAY_KEY,
    SESSION_KEY,
    load_display_messages,
    load_messages,
    redis_ok,
    save_display_messages,
    save_messages,
)
from agent.types import DisplayMessage


async def test_load_messages_returns_empty_list_for_new_session(
    fake_redis: Redis,
):
    result = await load_messages("new-session")
    assert result == [], "Expected empty list for a session with no history"


async def test_load_messages_returns_stored_messages(fake_redis: Redis):
    messages = [{"role": "user", "content": "hello"}]
    await fake_redis.set(SESSION_KEY.format(session_id="s1"), json.dumps(messages))

    result = await load_messages("s1")
    assert result == messages, "Expected stored messages to be returned"


async def test_load_messages_sessions_are_isolated(fake_redis: Redis):
    key_s1 = SESSION_KEY.format(session_id="s1")
    key_s2 = SESSION_KEY.format(session_id="s2")
    await fake_redis.set(key_s1, json.dumps([{"role": "user", "content": "one"}]))
    await fake_redis.set(key_s2, json.dumps([{"role": "user", "content": "two"}]))

    assert (await load_messages("s1"))[0]["content"] == "one", (
        "Expected session s1 messages"
    )
    assert (await load_messages("s2"))[0]["content"] == "two", (
        "Expected session s2 messages"
    )


async def test_save_messages_persists(fake_redis: Redis):
    messages = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    await save_messages("s1", messages)  # ty: ignore[invalid-argument-type]

    raw = await fake_redis.get(SESSION_KEY.format(session_id="s1"))
    assert raw is not None, "Expected messages to be persisted in Redis"
    assert json.loads(raw) == messages, "Expected persisted messages to match"


async def test_save_messages_overwrites_previous(fake_redis: Redis):
    await save_messages("s1", [{"role": "user", "content": "first"}])
    await save_messages("s1", [{"role": "user", "content": "second"}])

    result = await load_messages("s1")
    assert len(result) == 1, "Expected previous messages to be overwritten"
    assert result[0]["content"] == "second", "Expected latest messages"


async def test_save_and_load_roundtrip_with_complex_messages(fake_redis: Redis):
    messages = [
        {"role": "user", "content": "query"},
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "Let me check."},
                {"type": "tool_use", "id": "t1", "name": "get_data", "input": {}},
            ],
        },
        {
            "role": "user",
            "content": [
                {"type": "tool_result", "tool_use_id": "t1", "content": "data"},
            ],
        },
    ]
    await save_messages("s1", messages)  # ty: ignore[invalid-argument-type]
    result = await load_messages("s1")
    assert result == messages, "Expected complex message structures to roundtrip"


async def test_redis_ok_returns_true_when_connected(fake_redis: Redis):
    assert await redis_ok() is True, "Expected redis_ok to return True with fake Redis"


async def test_redis_ok_returns_false_when_disconnected(
    fake_redis: Redis,
    monkeypatch: pytest.MonkeyPatch,
):
    async def raise_connection_error():
        raise ConnectionError

    monkeypatch.setattr(fake_redis, "ping", raise_connection_error)

    assert await redis_ok() is False, (
        "Expected redis_ok to return False when disconnected"
    )


def test_key_format():
    assert SESSION_KEY.format(session_id="abc-123") == "agent:session:abc-123", (
        "Expected key to follow agent:session:{session_id} format"
    )


# ── DisplayMessage tests ──────────────────────────────────────────────────────


def test_display_message_auto_generates_id():
    msg = DisplayMessage(role="user", content="hello")
    assert msg.id, "Expected id to be auto-generated"


def test_display_message_ids_are_unique():
    a = DisplayMessage(role="user", content="x")
    b = DisplayMessage(role="user", content="x")
    assert a.id != b.id, "Expected each DisplayMessage to get a unique id"


def test_display_message_explicit_id():
    msg = DisplayMessage(id="fixed-id", role="assistant", content="hi")
    assert msg.id == "fixed-id"


async def test_load_display_messages_returns_empty_list(fake_redis: Redis):
    result = await load_display_messages("new-session")
    assert result == [], "Expected empty list for a new session"


async def test_save_and_load_display_messages_roundtrip(fake_redis: Redis):
    messages = [
        DisplayMessage(id="id-1", role="user", content="hello"),
        DisplayMessage(id="id-2", role="assistant", content="hi there"),
    ]
    await save_display_messages("s1", messages)
    result = await load_display_messages("s1")

    assert len(result) == 2
    assert result[0].id == "id-1"
    assert result[0].role == "user"
    assert result[0].content == "hello"
    assert result[1].id == "id-2"
    assert result[1].role == "assistant"


async def test_load_display_messages_hydrates_ids(fake_redis: Redis):
    """Old messages without an id field get a new uuid assigned on load."""
    raw = [{"role": "user", "content": "old message"}]
    await fake_redis.set(DISPLAY_KEY.format(session_id="s1"), json.dumps(raw))

    result = await load_display_messages("s1")
    assert len(result) == 1
    assert result[0].id, "Expected id to be generated for legacy message"
    assert result[0].role == "user"


def test_display_key_format():
    assert DISPLAY_KEY.format(session_id="abc-123") == "agent:session:abc-123:display"
