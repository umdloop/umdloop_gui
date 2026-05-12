"""Entrypoint for the unified Rover Backend.

Usage:
    python -m umdloop_gui_web.backend

Launches the FastAPI app on 0.0.0.0:5000 via uvicorn.
"""

import uvicorn

from .app import app
from .config import settings

if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
