"""Monitor Config model — maps X display indexes to monitor slots."""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel


MonitorSlot = Literal["slot-1", "slot-2", "slot-3", "slot-4", "slot-5"]
HostId = Literal["cc1", "cc2"]


class DisplayEntry(BaseModel):
    """A single display-to-slot mapping."""

    x_display_index: int
    monitor_slot: MonitorSlot


class MonitorConfig(BaseModel):
    """Top-level monitor configuration for a CC computer."""

    host_id: HostId
    displays: List[DisplayEntry]
