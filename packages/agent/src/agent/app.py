import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Annotated, Any

import anthropic
from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastmcp import Client
from loguru import logger

from agent.constants import MODEL
from agent.errors import ToolsNotReadyError
from agent.mcp_tools import fetch_tools, mcp_session, poll_tools, tools_ready
from agent.session import (
    load_display_messages,
    load_messages,
    redis_ok,
    save_display_messages,
    save_messages,
)
from agent.session_context import SessionContextMiddleware, session_log_patcher
from agent.types import (
    ChatRequest,
    ErrorResponse,
    HealthCheck,
    ReadyCheck,
    is_text_content,
)

if TYPE_CHECKING:
    from anthropic.types import ToolUseBlock
    from anthropic.types.tool_param import ToolParam
    from anthropic.types.tool_result_block_param import ToolResultBlockParam


MCPSession = Annotated[Client[Any], Depends(mcp_session)]
ToolsReady = Annotated[bool, Depends(tools_ready)]
RedisReady = Annotated[bool, Depends(redis_ok)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.anthropic_tools = await fetch_tools()
    task = asyncio.create_task(poll_tools(app))
    yield
    task.cancel()


app = FastAPI(
    lifespan=lifespan,
    description="Claude agent linked to an MCP server",
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

app.add_middleware(SessionContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.configure(patcher=session_log_patcher)

client = anthropic.Anthropic()


def _error_response(status_code: int, error: str) -> JSONResponse:
    body = ErrorResponse(error=error, status_code=status_code)
    return JSONResponse(status_code=status_code, content=body.model_dump())


@app.exception_handler(HTTPException)
async def http_exception_handler(
    _request: Request,
    exc: HTTPException,
) -> JSONResponse:
    return _error_response(exc.status_code, exc.detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return _error_response(422, str(exc))


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    _request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception("Unhandled exception")
    return _error_response(500, str(exc))


@app.get("/health")
def health() -> HealthCheck:
    """Get the health status of the server."""
    return {"status": "ok"}


@app.get(
    "/ready",
    responses={
        503: {
            "model": ReadyCheck,
            "description": "One or more dependencies are not ready",
        },
    },
)
def ready(tools: ToolsReady, redis: RedisReady, response: Response) -> ReadyCheck:
    """Check if the server and its dependencies are ready."""
    if all((tools, redis)):
        return {"status": "ok"}
    response.status_code = 503
    return {
        "status": "not ok",
        "details": {
            "mcp-server:tools": "ok" if tools else "not ok",
            "redis": "ok" if redis else "not ok",
        },
    }


@app.get("/sessions/{session_id}")
async def get_session(session_id: str) -> list[dict[str, str]]:
    """Return display messages for a session."""
    logger.info("Loading session")
    return await load_display_messages(session_id)


@app.post("/chat")
async def chat(request: ChatRequest, session: MCPSession, tools: ToolsReady):
    if not tools:
        raise ToolsNotReadyError()
    anthropic_tools: list[ToolParam] = app.state.anthropic_tools
    session_id = request.session_id

    async def generate() -> AsyncGenerator[str]:
        logger.info("Chat started")
        messages = await load_messages(session_id)
        display = await load_display_messages(session_id)

        messages.append({"role": "user", "content": request.message})
        display.append({"role": "user", "content": request.message})

        full_response = ""

        while True:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                messages=messages,
                tools=anthropic_tools if anthropic_tools else anthropic.omit,
            )

            # Collect text and tool uses from the response
            tool_uses: list[ToolUseBlock] = []
            text_blocks: list[str] = []
            for block in response.content:
                if block.type == "text":
                    text_blocks.append(block.text)  # ty: ignore[unresolved-attribute]
                elif block.type == "tool_use":
                    tool_uses.append(block)  # ty: ignore[invalid-argument-type]

            # If no tool calls, this is the final answer
            if not tool_uses:
                for text in text_blocks:
                    full_response += text
                    yield text
                break

            # Add assistant message with full content (text + tool_use blocks)
            messages.append(
                {
                    "role": "assistant",
                    "content": [block.model_dump() for block in response.content],
                }
            )

            # Execute tool calls and build tool results
            thinking_parts = [t for t in text_blocks if t.strip()]
            chart_markers: list[str] = []
            tool_results: list[ToolResultBlockParam] = []
            for tool_use in tool_uses:
                logger.info("Calling tool", extra={"tool": tool_use.name})
                result = await session.call_tool(tool_use.name, tool_use.input)
                tool_result_content = ""
                for content in result.content:
                    if is_text_content(content):
                        tool_result_content += content.text
                thinking_parts.append(
                    f"Called **{tool_use.name}**: `{tool_result_content[:200]}`"
                )
                if tool_use.name == "plot_medians":
                    chart_markers.append(f"<!--CHART:{tool_result_content}-->")
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": tool_result_content,
                    }
                )

            # Emit thinking first, then charts outside the expander
            thinking = "\n\n".join(thinking_parts)
            full_response += f"<!--THINKING:{thinking}-->"
            yield f"<!--THINKING:{thinking}-->"
            for marker in chart_markers:
                full_response += marker
                yield marker

            messages.append({"role": "user", "content": tool_results})

        # Persist the full history and display messages
        messages.append({"role": "assistant", "content": full_response})
        display.append({"role": "assistant", "content": full_response})
        await save_messages(session_id, messages)
        await save_display_messages(session_id, display)
        logger.info("Chat completed")

    return StreamingResponse(generate(), media_type="text/plain")
