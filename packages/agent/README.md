# Agent

FastAPI server that connects Claude to tools exposed by an MCP server. It receives chat messages, runs an agentic loop (Claude API call, tool execution, repeat), and streams the final response back to the client. Conversation history is persisted in Redis, keyed by session ID.

## Endpoints

| Method | Path      | Description                              |
| ------ | --------- | ---------------------------------------- |
| GET    | `/health` | Liveness check                           |
| GET    | `/ready`  | Readiness check (MCP tools + Redis)      |
| POST   | `/chat`   | Stream an agentic chat response          |

## Configuration

All settings are read from environment variables:

| Variable                 | Default                        | Description                        |
| ------------------------ | ------------------------------ | ---------------------------------- |
| `MCP_SERVER_URL`         | `http://localhost:8080`        | URL of the MCP server              |
| `ANTHROPIC_API_KEY`      | —                              | Anthropic API key                  |
| `ANTHROPIC_MODEL`        | `claude-sonnet-4-20250514`     | Claude model to use                |
| `TOOL_REFRESH_INTERVAL`  | `30`                           | Seconds between tool list refreshes|
| `REDIS_URL`              | `redis://localhost:6379`       | Redis URL for session storage      |

## Running

```bash
uv run agent
```

The server starts on `http://0.0.0.0:8000`.

## Development

```bash
# run tests
uv run pytest packages/agent/tests
```
