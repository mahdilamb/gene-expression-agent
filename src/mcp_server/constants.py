import os
from pathlib import Path

DATA_DIR = (Path(__file__) / ".." / ".." / ".." / "data").resolve()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
