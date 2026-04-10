import os

import uvicorn

from mcp_server import app


def main():
    uvicorn.run(app.app, port=int(os.getenv("PORT", "8080")), host="0.0.0.0")


if __name__ == "__main__":
    main()
