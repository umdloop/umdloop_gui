"""
Mock rosbridge server for local Autonomous Navigation Mission testing.

Speaks the subset of the rosbridge v2 protocol that the GUI uses — `subscribe`,
`unsubscribe`, `call_service`, `send_action_goal`, `cancel_action_goal` — and
runs a small mission_executive state machine so the Autonomy Operator tab can be
exercised end-to-end with no ROS, no Jetson, and no rover.

What it simulates (matches mission_executive_node.cpp behaviour):
  • Topics: /nav_status, /led_status, /nav_enabled, /waypoint_queue, /heading,
    /yolo/target_found, /yolo/target_label, /yolo/target_center,
    /yolo/detections, and the ZED camera_info.
  • Services: ~/set_target, ~/skip, ~/abort, ~/teleop.
  • Action:  ~/navigate_to_target  (feedback + result).

Mission outcomes (deterministic, so both banner paths are testable):
  • GNSS        → drives in, STOPPED_AT_TARGET, SUCCESS.
  • Object      → drives in, spiral, YOLO detection fires, SPIRAL_DONE, SUCCESS.
  • ArUco Post 1→ drives in, confirms tag, STOPPED_AT_TARGET, SUCCESS.
  • ArUco Post 2→ drives in, spiral times out, SPIRAL_DONE, FAILED-SEARCH.

Run standalone:   uv run python mock_rosbridge.py      (listens on ws://0.0.0.0:9090)
Or it is started automatically by dev_server.py.
"""

import asyncio
import json
import math
import threading
import time

import websockets

HOST = "0.0.0.0"
PORT = 9090

# Target-type enum (SetTarget.srv / NavigateToTarget.action).
GNSS_ONLY, ARUCO_POST_1, ARUCO_POST_2, OBJECT = 0, 1, 2, 3
TYPE_STR = {GNSS_ONLY: "GNSS", ARUCO_POST_1: "ARUCO_1", ARUCO_POST_2: "ARUCO_2", OBJECT: "OBJ_DETECT"}

CAM_W, CAM_H = 1280, 720
CAMINFO_TOPIC = "/zed/zed_node/rgb/camera_info"

_START = time.time()

# ── Shared mission state (single event loop → no locks needed) ────────────────
M = {
    "state": "IDLE",
    "active_target_id": "",
    "active_target_type": GNSS_ONLY,
    "is_return": False,
    "dist": 0.0,
    "speed": 0.0,
    "nav_enabled": False,
    "targets": {},   # id -> {id, target_type, tolerance_m, lat, lon, visited, skipped}
    "order": [],     # registration order of ids
    "yolo_active": False,
    "yolo_label": "",
}

CLIENTS = set()
LATCHED = {}          # topic -> last msg (for transient_local late-join)
_goal_task = None     # asyncio.Task for the running navigate_to_target


# ── rosbridge framing ─────────────────────────────────────────────────────────
async def _send(ws, obj):
    try:
        await ws.send(json.dumps(obj))
    except Exception:
        pass


def publish(topic, msg, latch=False):
    """Broadcast a publish frame to every connected client."""
    if latch:
        LATCHED[topic] = msg
    frame = json.dumps({"op": "publish", "topic": topic, "msg": msg})
    dead = []
    for ws in CLIENTS:
        try:
            asyncio.create_task(_raw(ws, frame))
        except Exception:
            dead.append(ws)
    for ws in dead:
        CLIENTS.discard(ws)


async def _raw(ws, frame):
    try:
        await ws.send(frame)
    except Exception:
        CLIENTS.discard(ws)


# ── Message builders ──────────────────────────────────────────────────────────
def led_for_state(state):
    """Mirror mission_executive_node.cpp publishLedStatus()."""
    red = {"cmd": 1, "r": 255, "g": 0, "b": 0, "param": 0}
    blue = {"cmd": 1, "r": 0, "g": 0, "b": 255, "param": 0}
    flash_green = {"cmd": 2, "r": 0, "g": 255, "b": 0, "param": 20}
    off = {"cmd": 255, "r": 0, "g": 0, "b": 0, "param": 0}
    if state in ("NAVIGATING", "ARUCO_CONFIRM", "ARUCO_APPROACH", "ARRIVING", "RETURNING", "SPIRAL_COVERAGE", "ABORTING"):
        return red
    if state == "TELEOP":
        return blue
    if state in ("STOPPED_AT_TARGET", "STOPPED_AT_RETURN", "SPIRAL_DONE"):
        return flash_green
    return off


def nav_status_msg():
    return {
        "state": M["state"],
        "active_target_id": M["active_target_id"],
        "active_target_type": M["active_target_type"],
        "goal_source": 0,
        "distance_to_goal_m": M["dist"],
        "cross_track_error_m": 0.0,
        "heading_error_rad": 0.0,
        "robot_speed_mps": M["speed"],
        "is_return": M["is_return"],
        "last_planner_event": 2,
    }


def heading_msg():
    h = (time.time() - _START) * (2 * math.pi / 60) % (2 * math.pi)
    return {
        "header": {"stamp": {"sec": 0, "nanosec": 0}, "frame_id": "base_link"},
        "heading": h,
        "heading_acc": 0.05,
        "compass_bearing": (90 - math.degrees(h)) % 360,
    }


def caminfo_msg():
    return {
        "header": {"stamp": {"sec": 0, "nanosec": 0}, "frame_id": "zed_left"},
        "width": CAM_W,
        "height": CAM_H,
        "distortion_model": "plumb_bob",
    }


def waypoint_queue_msg():
    arr = []
    for tid in M["order"]:
        e = M["targets"][tid]
        is_active = M["active_target_id"] == tid and not e["visited"] and not e["skipped"]
        status = "PENDING"
        if e["skipped"]:
            status = "SKIPPED"
        elif e["visited"]:
            status = "VISITED"
        elif is_active:
            status = "ACTIVE"
        arr.append({
            "id": tid,
            "x": 0.0,
            "y": 0.0,
            "type": TYPE_STR.get(e["target_type"], "UNKNOWN"),
            "type_code": e["target_type"],
            "goal_source": 0,
            "tolerance": e["tolerance_m"],
            "visited": e["visited"],
            "skipped": e["skipped"],
            "status": status,
        })
    return {"data": json.dumps(arr)}


def detection_msg():
    """One moving box near frame centre — class 'Bottle'."""
    t = time.time() - _START
    cx = CAM_W * (0.5 + 0.06 * math.sin(t * 0.8))
    cy = CAM_H * (0.5 + 0.05 * math.cos(t * 0.6))
    sx, sy = CAM_W * 0.16, CAM_H * 0.22
    return {
        "header": {"stamp": {"sec": 0, "nanosec": 0}, "frame_id": "zed_left"},
        "detections": [{
            "header": {"stamp": {"sec": 0, "nanosec": 0}, "frame_id": "zed_left"},
            "results": [{
                "hypothesis": {"class_id": M["yolo_label"] or "Bottle", "score": 0.91},
                "pose": {"pose": {"position": {"x": 0.0, "y": 0.0, "z": 0.0}}},
            }],
            "bbox": {"center": {"position": {"x": cx, "y": cy}, "theta": 0.0}, "size_x": sx, "size_y": sy},
            "id": "0",
        }],
    }, (cx, cy)


def publish_queue():
    publish("/waypoint_queue", waypoint_queue_msg(), latch=True)


# ── Mission simulation ────────────────────────────────────────────────────────
async def run_navigation(goal_id, target_id, is_return):
    """Drive the state machine for one navigate_to_target goal."""
    t = M["targets"].get(target_id)
    if not t:
        publish_action_result(goal_id, False, f"Unknown target {target_id}")
        return

    ttype = t["target_type"]
    tol = max(t["tolerance_m"], 1.5)
    M["active_target_id"] = target_id
    M["active_target_type"] = ttype
    M["is_return"] = is_return
    M["nav_enabled"] = True
    M["yolo_active"] = False
    M["yolo_label"] = "Bottle"
    publish("/nav_enabled", {"data": True}, latch=True)
    publish_queue()

    try:
        # ── Drive toward the GPS vicinity ──
        M["state"] = "RETURNING" if is_return else "NAVIGATING"
        M["dist"] = max(tol + 12.0, 25.0)
        M["speed"] = 1.2
        while M["dist"] > tol:
            M["dist"] = max(tol, M["dist"] - 1.6)
            publish_action_feedback(goal_id)
            await asyncio.sleep(0.35)

        # ── Arrival behaviour by type ──
        if is_return:
            M["state"], M["speed"] = "STOPPED_AT_RETURN", 0.0
            _finish(goal_id, target_id, True, "Arrived at target")
            return

        if ttype == OBJECT:
            M["state"] = "SPIRAL_COVERAGE"
            for i in range(10):
                if i == 4:  # detection fires mid-spiral
                    M["yolo_active"] = True
                publish_action_feedback(goal_id)
                await asyncio.sleep(0.4)
            M["state"], M["speed"] = "SPIRAL_DONE", 0.0
            _finish(goal_id, target_id, True, "Detection found during spiral coverage")
            return

        if ttype in (ARUCO_POST_1, ARUCO_POST_2):
            M["state"] = "ARUCO_CONFIRM"
            await asyncio.sleep(1.2)
            if ttype == ARUCO_POST_1:
                M["state"] = "ARUCO_APPROACH"
                while M["dist"] > 2.0:
                    M["dist"] = max(2.0, M["dist"] - 1.0)
                    publish_action_feedback(goal_id)
                    await asyncio.sleep(0.3)
                M["state"], M["speed"] = "STOPPED_AT_TARGET", 0.0
                _finish(goal_id, target_id, True, "Arrived within 2m of ArUco post")
            else:
                # Post 2 simulates a tag-not-found spiral timeout (FAILED-SEARCH).
                M["state"] = "SPIRAL_COVERAGE"
                for _ in range(10):
                    publish_action_feedback(goal_id)
                    await asyncio.sleep(0.4)
                M["state"], M["speed"] = "SPIRAL_DONE", 0.0
                _finish(goal_id, target_id, False, "ArUco tag not found during spiral search")
            return

        # GNSS
        M["state"], M["speed"] = "STOPPED_AT_TARGET", 0.0
        _finish(goal_id, target_id, True, "Arrived at target")

    except asyncio.CancelledError:
        # Preempted / aborted — handled by the caller that cancelled us.
        raise


def _finish(goal_id, target_id, success, message):
    if success:
        M["targets"][target_id]["visited"] = True
    publish_queue()
    publish_action_result(goal_id, success, message)


def publish_action_feedback(goal_id):
    publish_to_clients({
        "op": "action_feedback",
        "id": goal_id,
        "values": {"distance_to_goal_m": M["dist"], "cross_track_error_m": 0.0, "state": M["state"]},
    })


def publish_action_result(goal_id, success, message):
    publish_to_clients({
        "op": "action_result",
        "id": goal_id,
        "values": {"success": success, "message": message},
        "result": True,
        "status": 4 if success else 6,  # SUCCEEDED / ABORTED (rough)
    })


def publish_to_clients(obj):
    frame = json.dumps(obj)
    for ws in list(CLIENTS):
        asyncio.create_task(_raw(ws, frame))


def cancel_goal(reason="Cancelled"):
    global _goal_task
    if _goal_task and not _goal_task.done():
        gid = getattr(_goal_task, "_goal_id", None)
        _goal_task.cancel()
        if gid:
            publish_action_result(gid, False, reason)
    _goal_task = None


# ── Service handlers ──────────────────────────────────────────────────────────
def handle_service(service, args):
    name = service.rsplit("/", 1)[-1]
    if name == "set_target":
        tid = args.get("target_id") or f"t{len(M['order'])}"
        existing = M["targets"].get(tid)
        M["targets"][tid] = {
            "id": tid,
            "target_type": int(args.get("target_type", 0)),
            "tolerance_m": float(args.get("tolerance_m", 3.0)),
            "lat": args.get("lat", 0.0),
            "lon": args.get("lon", 0.0),
            "visited": existing["visited"] if existing else False,
            "skipped": existing["skipped"] if existing else False,
        }
        if tid not in M["order"]:
            M["order"].append(tid)
        publish_queue()
        return {"success": True, "message": f"Registered {tid}"}

    if name == "skip":
        if M["active_target_id"]:
            M["targets"][M["active_target_id"]]["skipped"] = True
        cancel_goal("Skipped")
        M["state"], M["dist"], M["speed"] = "IDLE", 0.0, 0.0
        publish_queue()
        return {"success": True, "message": "Skipped active target"}

    if name == "abort":
        cancel_goal("Aborted")
        M["state"], M["dist"], M["speed"] = "ABORTING", 0.0, 0.0
        M["yolo_active"] = False
        asyncio.create_task(_settle_to_idle())
        return {"success": True, "message": "Aborted"}

    if name == "teleop":
        on = bool(args.get("data", False))
        cancel_goal("Teleop engaged")
        M["state"] = "TELEOP" if on else "IDLE"
        M["dist"], M["speed"], M["yolo_active"] = 0.0, 0.0, False
        return {"success": True, "message": f"Teleop {'on' if on else 'off'}"}

    return {"success": False, "message": f"Unknown service {service}"}


async def _settle_to_idle():
    await asyncio.sleep(1.0)
    if M["state"] == "ABORTING":
        M["state"] = "IDLE"


# ── Connection handler ────────────────────────────────────────────────────────
async def handler(ws):
    global _goal_task
    CLIENTS.add(ws)
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            op = msg.get("op")

            if op == "subscribe":
                topic = msg.get("topic")
                if topic in LATCHED:
                    await _send(ws, {"op": "publish", "topic": topic, "msg": LATCHED[topic]})

            elif op == "call_service":
                values = handle_service(msg.get("service", ""), msg.get("args", {}) or {})
                await _send(ws, {
                    "op": "service_response",
                    "id": msg.get("id"),
                    "service": msg.get("service"),
                    "values": values,
                    "result": True,
                })

            elif op == "send_action_goal":
                args = msg.get("args", {}) or {}
                gid = msg.get("id")
                target_id = args.get("target_id", "")
                is_return = bool(args.get("is_return", False))
                cancel_goal("Preempted")
                _goal_task = asyncio.create_task(run_navigation(gid, target_id, is_return))
                _goal_task._goal_id = gid

            elif op == "cancel_action_goal":
                cancel_goal("Cancelled")
                M["state"], M["dist"], M["speed"] = "IDLE", 0.0, 0.0

            # advertise / unadvertise / unsubscribe → ignored
    finally:
        CLIENTS.discard(ws)


# ── Periodic publisher ────────────────────────────────────────────────────────
async def ticker():
    tick = 0
    while True:
        publish("/nav_status", nav_status_msg(), latch=True)
        publish("/led_status", led_for_state(M["state"]), latch=True)
        publish("/heading", heading_msg())
        publish("/nav_enabled", {"data": M["nav_enabled"]}, latch=True)

        if M["yolo_active"]:
            det, (cx, cy) = detection_msg()
            publish("/yolo/detections", det)
            publish("/yolo/target_found", {"data": True})
            publish("/yolo/target_label", {"data": M["yolo_label"] or "Bottle"})
            publish("/yolo/target_center", {
                "header": {"frame_id": "zed_left"},
                "point": {"x": cx, "y": cy, "z": 0.0},
            })
        else:
            publish("/yolo/target_found", {"data": False})

        if tick % 4 == 0:
            publish(CAMINFO_TOPIC, caminfo_msg(), latch=True)
        tick += 1
        await asyncio.sleep(0.25)


async def _main():
    async with websockets.serve(handler, HOST, PORT, max_size=None):
        await ticker()


def start_in_thread():
    """Start the mock rosbridge on its own event loop in a daemon thread."""
    threading.Thread(target=lambda: asyncio.run(_main()), daemon=True).start()


if __name__ == "__main__":
    print(f"Mock rosbridge listening on ws://{HOST}:{PORT}")
    print("  Mission outcomes: GNSS→success · Object→detect+success · Post1→success · Post2→FAILED-SEARCH")
    asyncio.run(_main())
