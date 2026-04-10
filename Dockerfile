FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
ENV UV_NO_DEV=1
WORKDIR /app

COPY uv.lock pyproject.toml /app/

RUN uv sync --frozen --no-install-project

COPY ./src /app/src

RUN touch /app/README.md
RUN uv sync --frozen

ENTRYPOINT [ "uv", "run", "--no-sync", "mcp-server"]
