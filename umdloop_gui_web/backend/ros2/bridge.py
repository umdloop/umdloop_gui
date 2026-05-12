"""ROS2 bridge router — rover position, nav mode, GPS goal.

Ported from the prior Flask server.py and ros_bridge.py.
"""

from __future__ import annotations

import threading
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# ROS2 context (lazy-initialized)
# ---------------------------------------------------------------------------

_ros_context = None
_ros_lock = threading.Lock()


def _get_ros_context():
    """Lazy-import and start the ROS context singleton."""
    global _ros_context
    if _ros_context is not None:
        return _ros_context

    with _ros_lock:
        if _ros_context is not None:
            return _ros_context
        try:
            from ros_bridge import ros_context
            ros_context.start()
            _ros_context = ros_context
        except Exception:
            _ros_context = None
    return _ros_context


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class PathPlanRequest(BaseModel):
    mode: str = "GNSS"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    position_tolerance: float = 0.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/navigation/rover-position")
async def rover_position():
    """Return the latest rover GPS fix from ROS2."""
    ctx = _get_ros_context()
    if ctx is None or ctx.node is None:
        return JSONResponse({"ok": True, "fix": False})

    pos = ctx.node.rover_position
    if pos is None:
        return JSONResponse({"ok": True, "fix": False})

    return JSONResponse({
        "ok": True,
        "fix": True,
        "latitude": pos["latitude"],
        "longitude": pos["longitude"],
    })


@router.post("/navigation/path-plan")
async def navigation_path_plan(data: PathPlanRequest):
    """Send a navigation goal to the rover via ROS2 action."""
    # UI -> BT mapping
    mode_map = {
        "GNSS": "GNSS",
        "Object Detection": "ObjectDetection",
        "Aruco Tag": "ArucoDetection",
    }
    bt_mode = mode_map.get(data.mode)
    if not bt_mode:
        return JSONResponse({"ok": False, "error": f"Unknown mode '{data.mode}'"}, status_code=400)

    ctx = _get_ros_context()
    if ctx is None or ctx.node is None:
        return JSONResponse({"ok": False, "error": "ROS2 bridge unavailable"}, status_code=503)

    # Publish nav mode for BT router
    ctx.node.publish_nav_mode(bt_mode)

    # GNSS goal only for GNSS or ArucoDetection modes
    if bt_mode in ("GNSS", "ArucoDetection"):
        if data.latitude is None or data.longitude is None:
            return JSONResponse({"ok": False, "error": "Invalid latitude/longitude"}, status_code=400)

        accepted, success, msg = ctx.node.send_gps_goal_blocking(
            data.latitude, data.longitude, data.position_tolerance
        )
        return JSONResponse({
            "ok": True,
            "nav_mode": bt_mode,
            "goal_sent": True,
            "accepted": accepted,
            "success": success,
            "message": msg,
        })

    # ObjectDetection mode: only publish mode
    return JSONResponse({
        "ok": True,
        "nav_mode": bt_mode,
        "goal_sent": False,
        "message": "nav_mode published; no GNSS goal sent for ObjectDetection",
    })
