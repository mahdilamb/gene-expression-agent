import os

MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
TOOL_REFRESH_INTERVAL = int(os.getenv("TOOL_REFRESH_INTERVAL", "30"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:8501").split(",")
]
