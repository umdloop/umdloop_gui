"""Mission state persistence for the Mission Sync Service.

Reads/writes the active mission to /var/lib/umdloop/mission-state.json.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

VALID_MISSIONS = frozenset(
    ["delivery", "equipment-servicing", "autonomous-navigation", "science"]
)

MissionIdentifier = Literal[
    "delivery", "equipment-servicing", "autonomous-navigation", "science"
]

STATE_FILE_PATH = Path(
    os.environ.get("UMDLOOP_MISSION_STATE_PATH", "/var/lib/umdloop/mission-state.json")
)


class MissionState(BaseModel):
    """Pydantic model representing the persisted mission state."""

    active_mission: Optional[MissionIdentifier] = None

    @field_validator("active_mission", mode="before")
    @classmethod
    def validate_mission(cls, v: object) -> object:
        if v is None:
            return v
        if v not in VALID_MISSIONS:
            raise ValueError(f"Invalid mission identifier: {v!r}")
        return v


def load_state(path: Path = STATE_FILE_PATH) -> MissionState:
    """Load mission state from disk. Returns default state if file is missing or invalid."""
    try:
        data = path.read_text(encoding="utf-8")
        return MissionState.model_validate_json(data)
    except (FileNotFoundError, json.JSONDecodeError, ValueError):
        return MissionState()


def save_state(state: MissionState, path: Path = STATE_FILE_PATH) -> None:
    """Persist mission state to disk, creating parent directories if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(state.model_dump_json(indent=2), encoding="utf-8")
