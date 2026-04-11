import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any

import anthropic
from anthropic import DefaultAioHttpClient
from anthropic.types.tool_param import ToolParam
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
    get_parent,
    list_children,
    load_display_messages,
    load_messages,
    redis_ok,
    save_display_messages,
    save_messages,
    set_parent,
)
from agent.session_context import SessionContextMiddleware, session_log_patcher
from agent.types import (
    AskRequest,
    ChatRequest,
    DisplayMessage,
    ErrorResponse,
    HealthCheck,
    ReadyCheck,
    is_text_block,
    is_text_content,
    is_tool_use_block,
)

MCPSession = Annotated[Client[Any], Depends(mcp_session)]
ToolsReady = Annotated[bool, Depends(tools_ready)]
RedisReady = Annotated[bool, Depends(redis_ok)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.anthropic_tools = await fetch_tools()
    task = asyncio.create_task(poll_tools(app))
    async with anthropic.AsyncAnthropic(
        http_client=DefaultAioHttpClient(),
    ) as anthropic_client:
        app.state.anthropic_client = anthropic_client
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


async def _agentic_loop(
    client: anthropic.AsyncAnthropic,
    messages: list[Any],
    anthropic_tools: list[ToolParam],
    session: Client[Any],
    *,
    max_tokens: int = 4096,
    emit_thinking: bool = False,
) -> AsyncGenerator[str]:
    """Shared agentic loop: call Claude, execute tools, yield text."""
    while True:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=messages,
            tools=anthropic_tools if anthropic_tools else anthropic.omit,
            temperature=0.0,
            top_k=1,
        )

        tool_uses = [b for b in response.content if is_tool_use_block(b)]
        text_blocks = [b.text for b in response.content if is_text_block(b)]

        if not tool_uses:
            for text in text_blocks:
                yield text
            return

        messages.append(
            {
                "role": "assistant",
                "content": [block.model_dump() for block in response.content],
            }
        )

        thinking_parts = [t for t in text_blocks if t.strip()] if emit_thinking else []
        chart_markers: list[str] = []
        tool_results: list[dict[str, str]] = []
        for tool_use in tool_uses:
            logger.info("Calling tool", extra={"tool": tool_use.name})
            result = await session.call_tool(tool_use.name, tool_use.input)
            tool_result_content = ""
            for content in result.content:
                if is_text_content(content):
                    tool_result_content += content.text
            if emit_thinking:
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

        if emit_thinking and thinking_parts:
            thinking = "\n\n".join(thinking_parts)
            yield f"<!--THINKING:{thinking}-->"
            for marker in chart_markers:
                yield marker

        messages.append({"role": "user", "content": tool_results})


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
async def get_session(session_id: str) -> list[DisplayMessage]:
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
        display.append(DisplayMessage(role="user", content=request.message))

        full_response = ""
        async for chunk in _agentic_loop(
            app.state.anthropic_client,
            messages,
            anthropic_tools,
            session,
            max_tokens=4096,
            emit_thinking=True,
        ):
            full_response += chunk
            yield chunk

        messages.append({"role": "assistant", "content": full_response})
        display.append(DisplayMessage(role="assistant", content=full_response))
        await save_messages(session_id, messages)
        await save_display_messages(session_id, display)
        logger.info("Chat completed")

    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/sessions/{session_id}/threads")
async def get_threads(session_id: str) -> list[dict[str, Any]]:
    """Return child threads (side-chats) for a session."""
    return await list_children(session_id)


@app.get("/sessions/{session_id}/threads/{thread_id}")
async def get_thread(session_id: str, thread_id: str) -> list[DisplayMessage]:
    """Return display messages for a specific thread."""
    parent = await get_parent(thread_id)
    if parent != session_id:
        raise HTTPException(404, "Thread not found under this session")
    return await load_display_messages(thread_id)


@app.post("/ask")
async def ask(request: AskRequest, session: MCPSession, tools: ToolsReady):
    """Side-chat question persisted as a child thread of the parent session."""
    if not tools:
        raise ToolsNotReadyError()
    anthropic_tools: list[ToolParam] = app.state.anthropic_tools

    thread_id = request.thread_id
    parent_id = request.session_id

    existing_parent = await get_parent(thread_id)
    if existing_parent is None:
        await set_parent(
            child_id=thread_id,
            parent_id=parent_id,
            meta={"context": request.context},
        )

    parent_messages = (
        await load_messages(parent_id) if request.include_chat_context else []
    )
    thread_messages = await load_messages(thread_id)
    thread_display = await load_display_messages(thread_id)

    if not thread_messages:
        thread_messages.append(
            {
                "role": "user",
                "content": (
                    f"The user wants to ask about something in the conversation.\n"
                    f"Context: {request.context}\n\n"
                    "Give concise, helpful answers. Do not use tool markers like "
                    "<!--CHART:--> or <!--TABLE:-->."
                ),
            }
        )
        thread_messages.append(
            {
                "role": "assistant",
                "content": "Sure, I can help you with that. What would you like to know?",
            }
        )

    thread_messages.append({"role": "user", "content": request.question})
    thread_display.append(DisplayMessage(role="user", content=request.question))

    combined = parent_messages + thread_messages

    async def generate() -> AsyncGenerator[str]:
        full_response = ""
        async for chunk in _agentic_loop(
            app.state.anthropic_client,
            combined,
            anthropic_tools,
            session,
            max_tokens=1024,
        ):
            full_response += chunk
            yield chunk

        thread_messages.append({"role": "assistant", "content": full_response})
        thread_display.append(DisplayMessage(role="assistant", content=full_response))
        await save_messages(thread_id, thread_messages)
        await save_display_messages(thread_id, thread_display)
        logger.info(
            "Thread message saved",
            extra={"thread": thread_id, "parent": parent_id},
        )

    return StreamingResponse(generate(), media_type="text/plain")
