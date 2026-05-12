"""Radio Status model — JSON payload returned by /radio/status."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class RadioStatus(BaseModel):
    """MikroTik radio link status."""

    connected: bool = False
    quality_percent: int = 0
    rssi_dbm: Optional[float] = None
    tx_ccq: Optional[float] = None
    rx_ccq: Optional[float] = None
    source: str = "unavailable"
    error: Optional[str] = None
