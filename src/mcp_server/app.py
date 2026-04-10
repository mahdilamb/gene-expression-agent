from fastmcp.server.event_store import EventStore

from mcp_server import mcp

app = mcp.mcp.http_app(
    transport="streamable-http",
    event_store=EventStore(),
)
