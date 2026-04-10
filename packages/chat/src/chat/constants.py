import os
from pathlib import Path

ASSETS_DIR = (Path(__file__).parent / "static").resolve()
AGENT_URL = os.getenv("AGENT_URL", "http://localhost:8000")
