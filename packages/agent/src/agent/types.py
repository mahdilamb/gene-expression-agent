from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Literal, NotRequired, TypedDict, TypeGuard

from mcp.types import TextContent
from pydantic import BaseModel, Field

if TYPE_CHECKING:
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


class ErrorResponse(BaseModel):
    error: str
    status_code: int


def is_text_content(content: ContentBlock) -> TypeGuard[TextContent]:
    """Check if a content block is a TextContent."""
    return isinstance(content, TextContent)
