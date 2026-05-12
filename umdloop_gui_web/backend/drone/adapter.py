"""Drone Backend Adapter — pymavlink UDP listener and WebSocket publisher.

Ingests MAVLink from the drone via UDP and publishes JSON telemetry
frames on WebSocket /ws/drone/telemetry.

Parses: BATTERY_STATUS, GLOBAL_POSITION_INT, VFR_HUD, HEARTBEAT
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.config import settings
from backend.models.drone_telemetry import DroneTelemetryFrame

router = APIRouter()

_clients: Set[WebSocket] = set()
_latest_frame: Optional[DroneTelemetryFrame] = None
_mavlink_task: Optional[asyncio.Task] = None


async def _broadcast(frame: DroneTelemetryFrame) -> None:
    """Send a telemetry frame to all connected WebSocket clients."""
    payload = frame.model_dump_json()
    disconnected: Set[WebSocket] = set()
    for ws in _clients:
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.add(ws)
    _clients.difference_update(disconnected)


def _parse_mavlink_messages(conn) -> Optional[DroneTelemetryFrame]:
    """Parse available MAVLink messages and build a telemetry frame.

    Returns a new frame if any message was parsed, None otherwise.
    """
    global _latest_frame

    msg = conn.recv_match(blocking=False)
    if msg is None:
        return None

    msg_type = msg.get_type()
    now_ms = int(time.time() * 1000)

    # Start from latest frame or create a fresh one
    base = _latest_frame.model_copy() if _latest_frame else DroneTelemetryFrame(timestamp_ms=now_ms)

    if msg_type == "BATTERY_STATUS":
        battery_pct = msg.battery_remaining  # -1 means unknown
        if battery_pct >= 0:
            base.battery_pct = battery_pct
        # Voltage is in millivolts in voltages array
        if msg.voltages and msg.voltages[0] != 65535:
            base.voltage_v = msg.voltages[0] / 1000.0
        base.timestamp_ms = now_ms

    elif msg_type == "GLOBAL_POSITION_INT":
        base.latitude = msg.lat / 1e7
        base.longitude = msg.lon / 1e7
        base.altitude_m = msg.relative_alt / 1000.0
        base.heading_deg = msg.hdg / 100.0 if msg.hdg != 65535 else base.heading_deg
        base.timestamp_ms = now_ms

    elif msg_type == "VFR_HUD":
        base.airspeed_mps = msg.airspeed
        base.groundspeed_mps = msg.groundspeed
        base.timestamp_ms = now_ms

    elif msg_type == "HEARTBEAT":
        # MAV_MODE_FLAG_SAFETY_ARMED = 128
        base.armed = bool(msg.base_mode & 128)
        base.timestamp_ms = now_ms

    else:
        return None

    _latest_frame = base
    return base


async def _mavlink_listener_loop() -> None:
    """Background task that listens for MAVLink UDP messages."""
    global _latest_frame

    try:
        from pymavlink import mavutil
    except ImportError:
        # pymavlink not installed — adapter is non-functional
        return

    port = settings.umdloop_drone_mavlink_udp_port
    conn = mavutil.mavlink_connection(
        f"udpin:0.0.0.0:{port}",
        autoreconnect=True,
    )

    while True:
        frame = await asyncio.get_event_loop().run_in_executor(
            None, _parse_mavlink_messages, conn
        )
        if frame is not None:
            await _broadcast(frame)
        else:
            # No message available, avoid busy-spinning
            await asyncio.sleep(0.01)


@router.on_event("startup")
async def _start_mavlink_listener():
    global _mavlink_task
    _mavlink_task = asyncio.create_task(_mavlink_listener_loop())


@router.on_event("shutdown")
async def _stop_mavlink_listener():
    global _mavlink_task
    if _mavlink_task is not None:
        _mavlink_task.cancel()
        try:
            await _mavlink_task
        except asyncio.CancelledError:
            pass


@router.websocket("/ws/drone/telemetry")
async def drone_telemetry_ws(websocket: WebSocket):
    """WebSocket endpoint for drone telemetry frames."""
    await websocket.accept()
    _clients.add(websocket)
    try:
        # Send latest frame on connect if available
        if _latest_frame is not None:
            await websocket.send_text(_latest_frame.model_dump_json())
        # Keep connection open; frames are pushed by the MAVLink listener
        while True:
            # Wait for client messages (ping/pong or close)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
