"""Export the OpenAPI spec from the agent FastAPI app to a JSON file."""

# /// script
# requires-python = ">=3.13"
# dependencies = ["fastapi>=0.135.3"]
# ///

import json
import sys
from pathlib import Path

# Ensure the agent package is importable
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "agent" / "src"))

from fastapi.openapi.utils import get_openapi  # noqa: E402

from agent.app import app  # noqa: E402

spec = get_openapi(
    title=app.title,
    version=app.version,
    description=app.description,
    routes=app.routes,
)
out = Path(__file__).resolve().parents[1] / "src" / "api" / "openapi.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(spec, indent=2) + "\n")
print(f"Wrote {out}")
