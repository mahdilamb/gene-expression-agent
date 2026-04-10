import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any

import anthropic
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastmcp import Client
from loguru import logger

from agent.constants import MODEL
from agent.mcp_tools import fetch_tools, mcp_session, poll_tools
from agent.server_dependencies import check_ready
from agent.session import (
    load_display_messages,
    load_messages,
    save_display_messages,
    save_messages,
)
from agent.session_context import SessionContextMiddleware, session_log_patcher
from agent.types import ChatRequest, ErrorResponse, HealthCheck, ReadyCheck

MCPSession = Annotated[Client[Any], Depends(mcp_session)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.anthropic_tools = await fetch_tools()
    task = asyncio.create_task(poll_tools(app))
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan, description="Claude agent linked to an MCP server")

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


@app.get("/ready")
def ready(status: Annotated[ReadyCheck, Depends(check_ready)]) -> ReadyCheck:
    """Check if the server and its dependencies are ready."""
    return status


@app.get("/sessions/{session_id}")
async def get_session(session_id: str) -> list[dict[str, str]]:
    """Return display messages for a session."""
    logger.info("Loading session")
    return await load_display_messages(session_id)


@app.post("/chat")
async def chat(request: ChatRequest, session: MCPSession):
    anthropic_tools = app.state.anthropic_tools
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
                messages=messages,  # ty: ignore[invalid-argument-type]
                tools=anthropic_tools if anthropic_tools else anthropic.NOT_GIVEN,  # ty: ignore[invalid-argument-type]
            )

            # Collect text and tool uses from the response
            tool_uses = []
            text_blocks = []
            for block in response.content:
                if block.type == "text":
                    text_blocks.append(block.text)
                elif block.type == "tool_use":
                    tool_uses.append(block)

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
            tool_results = []
            for tool_use in tool_uses:
                logger.info("Calling tool", extra={"tool": tool_use.name})
                result = await session.call_tool(tool_use.name, tool_use.input)
                tool_result_content = ""
                for content in result.content:
                    if hasattr(content, "text"):
                        tool_result_content += content.text  # ty: ignore[unsupported-operator]
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
