from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Literal, NotRequired, TypedDict, TypeGuard

from mcp.types import TextContent
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from anthropic.types import (
        ContentBlock as AnthropicContentBlock,
    )
    from anthropic.types import (
        TextBlock,
        ToolUseBlock,
    )
    from mcp.types import ContentBlock

type Status = Literal["ok", "not ok"]
type ServerDependency = Literal["mcp-server:tools", "redis"]
type ServerDependencyStatuses = dict[ServerDependency, Status]


class HealthCheck(TypedDict):
    status: Status


class ReadyCheck(TypedDict):
    status: Status
    details: NotRequired[ServerDependencyStatuses]


class DisplayMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class AskRequest(BaseModel):
    session_id: str
    thread_id: str
    question: str
    context: str
    include_chat_context: bool = False
    highlight_text: str | None = None


class ErrorResponse(BaseModel):
    error: str
    status_code: int


def is_text_content(content: ContentBlock) -> TypeGuard[TextContent]:
    """Check if a content block is a TextContent."""
    return isinstance(content, TextContent)


def is_text_block(
    block: AnthropicContentBlock,
) -> TypeGuard[TextBlock]:
    """Check if an Anthropic content block is a TextBlock."""
    return block.type == "text"


def is_tool_use_block(
    block: AnthropicContentBlock,
) -> TypeGuard[ToolUseBlock]:
    """Check if an Anthropic content block is a ToolUseBlock."""
    return block.type == "tool_use"
