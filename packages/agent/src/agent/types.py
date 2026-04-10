from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel

type Status = Literal["ok", "not ok"]
type ServerDependency = Literal["mcp-server:tools", "redis"]
type ServerDependencyStatuses = dict[ServerDependency, Status]


class HealthCheck(TypedDict):
    status: Status


class ReadyCheck(TypedDict):
    status: Status
    details: NotRequired[ServerDependencyStatuses]


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ErrorResponse(BaseModel):
    error: str
    status_code: int
