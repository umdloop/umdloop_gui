"""Rover Position model — JSON payload returned by /navigation/rover-position."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class RoverPosition(BaseModel):
    """Rover GPS fix."""

    ok: bool = True
    fix: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
