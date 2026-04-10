from unittest.mock import create_autospec

import fakeredis
import pytest
from fastmcp import Client
from mcp.types import Tool
from redis.asyncio import Redis

from .types import MockMCPClientCreator


@pytest.fixture
def mock_mcp_client() -> MockMCPClientCreator:
    def create_client(tools: list[Tool] | None = None):
        client = create_autospec(Client, instance=True)
        if tools is not None:
            client.list_tools.return_value = tools
        return client

    return create_client


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> Redis:
    """Patch the agent.session module to use an async fakeredis instance."""
    import agent.session as session_mod

    server = fakeredis.FakeServer()
    fake: Redis = fakeredis.FakeAsyncRedis(server=server, decode_responses=True)
    monkeypatch.setattr(session_mod, "_redis", fake)
    return fake
