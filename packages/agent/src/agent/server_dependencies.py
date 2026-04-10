from typing import Annotated

from fastapi import Depends, Request

from agent.session import redis_ok
from agent.types import ReadyCheck, ServerDependencyStatuses, Status


def _tools_status(request: Request) -> Status:
    """Check whether the app has successfully polled MCP tools."""
    tools = getattr(request.app.state, "anthropic_tools", None)
    return "ok" if tools is not None and len(tools) > 0 else "not ok"


async def _redis_status() -> Status:
    """Check whether Redis is reachable."""
    return "ok" if await redis_ok() else "not ok"


def check_ready(
    tools: Annotated[Status, Depends(_tools_status)],
    redis: Annotated[Status, Depends(_redis_status)],
) -> ReadyCheck:
    """Build a ready check from all server dependencies."""
    details: ServerDependencyStatuses = {
        "mcp-server:tools": tools,
        "redis": redis,
    }
    if all(v == "ok" for v in details.values()):
        return {"status": "ok"}
    return {"status": "not ok", "details": details}
