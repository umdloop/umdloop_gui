"""Mission State model — re-exports from mission_sync for unified model access."""

from __future__ import annotations

# Re-export the canonical MissionState from mission_sync
from backend.mission_sync.state import MissionState

__all__ = ["MissionState"]
