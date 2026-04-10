from typing import Any, Protocol

from fastmcp import Client
from mcp.types import Tool


class MockMCPClientCreator(Protocol):
    def __call__(self, tools: list[Tool] | None = None) -> Client[Any]: ...
