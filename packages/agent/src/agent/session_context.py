from __future__ import annotations

import contextvars
from typing import TYPE_CHECKING

from starlette.middleware.base import BaseHTTPMiddleware

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from loguru import Record
    from starlette.requests import Request
    from starlette.responses import Response

session_context: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "session_context", default=None
)


class SessionContextMiddleware(BaseHTTPMiddleware):
    """Extract session_id from the request and set it in context."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        session_id: str | None = None

        # From path param (e.g. /sessions/{session_id})
        session_id = request.path_params.get("session_id")

        # From JSON body (e.g. POST /chat)
        if not session_id and request.method == "POST":
            try:
                body = await request.json()
                session_id = body.get("session_id")
            except Exception:
                pass

        token = session_context.set(session_id)
        try:
            return await call_next(request)
        finally:
            session_context.reset(token)


def session_log_patcher(record: Record) -> None:
    """Loguru patcher that attaches session_id to log records."""
    record["extra"]["session_id"] = session_context.get()
