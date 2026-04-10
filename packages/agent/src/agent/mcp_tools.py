import asyncio
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import FastAPI
from fastmcp import Client
from loguru import logger
from mcp.types import Tool

from agent.constants import MCP_SERVER_URL, TOOL_REFRESH_INTERVAL


def mcp_to_anthropic_tools(tools: list[Tool]) -> list[dict[str, object]]:
    """Convert MCP Tools to the dict format expected by the Anthropic API."""
    return [
        {
            "name": tool.name,
            "description": tool.description or "",
            "input_schema": tool.inputSchema,
        }
        for tool in tools
    ]


async def mcp_session() -> AsyncGenerator[Client[Any]]:
    """Dependency that provides a connected fastmcp Client per request."""
    async with Client(f"{MCP_SERVER_URL}/mcp") as client:
        yield client


async def fetch_tools() -> list[dict[str, object]]:
    async with Client(f"{MCP_SERVER_URL}/mcp") as client:
        tools = await client.list_tools()
        return mcp_to_anthropic_tools(tools)


async def poll_tools(app: FastAPI) -> None:
    while True:
        await asyncio.sleep(TOOL_REFRESH_INTERVAL)
        try:
            app.state.anthropic_tools = await fetch_tools()
        except Exception:
            logger.exception("Failed to poll tools")
