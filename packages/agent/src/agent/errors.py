from fastapi.exceptions import HTTPException


class RedisNotReadyError(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=503, detail="Redis is not available")


class ToolsNotReadyError(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=503, detail="MCP tools are not available")
