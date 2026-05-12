"""Rover Backend — FastAPI application factory.

Creates the unified FastAPI app and mounts all routers.
Replaces the prior Flask server.py and separate raman_backend.py.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    app = FastAPI(title="UMD Loop Rover Backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Import and mount routers
    from backend.cameras.router import router as cameras_router
    from backend.ros2.bridge import router as ros2_router
    from backend.radio.router import router as radio_router
    from backend.spectrum.router import router as spectrum_router
    from backend.drone.adapter import router as drone_router

    app.include_router(cameras_router)
    app.include_router(ros2_router)
    app.include_router(drone_router)
    app.include_router(radio_router)
    app.include_router(spectrum_router)

    @app.get("/health")
    async def health():
        return {"ok": True}

    return app


app = create_app()
