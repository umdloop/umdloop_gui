"""
Lightweight stub server for local GUI development — no ROS, no YOLO, no Jetson needed.

Provides:
  GET  /navigation/rover-position  — slowly-drifting fake GPS position
  GET  /navigation/rover-heading   — continuously-rotating fake heading (radians, ROS 0=East CCW)
  GET  /tiles/<z>/<x>/<y>.jpg      — local cache first, falls back to MapTiler CDN
  POST /tiles/download             — real tile download (identical to production)
  GET  /tiles/download/status      — download progress

Run alongside the Next.js dev server:
  Terminal 1:  cd umdloop_gui_web && uv run python dev_server.py
  Terminal 2:  cd umdloop_gui_web && npm run dev

Then open http://localhost:3000
"""

import math
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib import request as urllib_request

from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Tile config (same as production) ──────────────────────────────────────────

MAPTILER_KEY = os.getenv("MAPTILER_KEY", "DDQqKsPBfdOZOVxgcoy5")
_TILES_DIR = os.path.join(os.path.dirname(__file__), "public", "tiles")

# ── Fake rover state ───────────────────────────────────────────────────────────
# Start at MDRS site; you can edit these to match wherever you want to test.

_BASE_LAT = 38.4065
_BASE_LON = -110.7917
_START_TIME = time.time()


def _fake_position():
    """Slowly circle around the base point so the rover marker visibly moves."""
    t = time.time() - _START_TIME
    radius_deg = 0.0002          # ~20 m radius
    lat = _BASE_LAT + radius_deg * math.sin(t * 0.15)
    lon = _BASE_LON + radius_deg * math.cos(t * 0.15)
    return lat, lon


def _fake_heading():
    """Rotate 0→2π over 60 s so you can see the arrow and minimap line spin."""
    t = time.time() - _START_TIME
    return (t * (2 * math.pi / 60)) % (2 * math.pi)   # radians, 0=East CCW


# ── Navigation stubs ──────────────────────────────────────────────────────────

@app.get("/navigation/rover-position")
def rover_position():
    lat, lon = _fake_position()
    return jsonify({"ok": True, "fix": True, "latitude": lat, "longitude": lon})


@app.get("/navigation/rover-heading")
def rover_heading():
    """REST heading fallback used by MapDeliveryView when ROSLIB is unavailable."""
    return jsonify({"ok": True, "heading": _fake_heading()})


# ── Tile proxy (identical to production server.py) ────────────────────────────

def _lat_lon_to_tile(lat, lon, zoom):
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def _tile_range(min_lat, min_lon, max_lat, max_lon, zoom):
    x_min, y_max = _lat_lon_to_tile(min_lat, min_lon, zoom)
    x_max, y_min = _lat_lon_to_tile(max_lat, max_lon, zoom)
    return x_min, x_max, y_min, y_max


def _bbox_from_center_radius(lat, lon, radius_km):
    delta_lat = radius_km / 111.32
    delta_lon = radius_km / (111.32 * math.cos(math.radians(lat)))
    return lat - delta_lat, lat + delta_lat, lon - delta_lon, lon + delta_lon


_download_lock = threading.Lock()
_download_state = {"running": False, "downloaded": 0, "skipped": 0, "total": 0, "errors": 0, "message": ""}


def _download_worker(min_lat, max_lat, min_lon, max_lon, min_zoom, max_zoom):
    tasks = []
    for z in range(min_zoom, max_zoom + 1):
        x_min, x_max, y_min, y_max = _tile_range(min_lat, min_lon, max_lat, max_lon, z)
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                out_path = os.path.join(_TILES_DIR, str(z), str(x), f"{y}.jpg")
                url = f"https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={MAPTILER_KEY}"
                tasks.append((url, out_path))

    with _download_lock:
        _download_state.update({"running": True, "downloaded": 0, "skipped": 0, "total": len(tasks), "errors": 0, "message": "Downloading…"})

    downloaded = skipped = errors = 0

    def fetch(args):
        url, out_path = args
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            return "skip"
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        tmp = out_path + ".tmp"
        try:
            with urllib_request.urlopen(url, timeout=8) as resp:
                data = resp.read()
            with open(tmp, "wb") as f:
                f.write(data)
            os.replace(tmp, out_path)
            return "ok"
        except Exception:
            if os.path.exists(tmp):
                os.remove(tmp)
            return "error"

    with ThreadPoolExecutor(max_workers=12) as pool:
        for result in pool.map(fetch, tasks):
            if result == "skip":
                skipped += 1
            elif result == "ok":
                downloaded += 1
            else:
                errors += 1
            with _download_lock:
                _download_state.update({"downloaded": downloaded, "skipped": skipped, "errors": errors})

    with _download_lock:
        _download_state.update({"running": False, "message": f"Done — {downloaded} new, {skipped} cached, {errors} errors"})


@app.get("/tiles/<int:z>/<int:x>/<int:y>.jpg")
def serve_tile(z, x, y):
    local_path = os.path.join(_TILES_DIR, str(z), str(x), f"{y}.jpg")
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return send_file(local_path, mimetype="image/jpeg")
    url = f"https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={MAPTILER_KEY}"
    try:
        with urllib_request.urlopen(url, timeout=5) as resp:
            data = resp.read()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        tmp = local_path + ".tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, local_path)
        return Response(data, mimetype="image/jpeg")
    except Exception:
        return "", 404


@app.post("/tiles/download")
def start_tile_download():
    if _download_state["running"]:
        return jsonify({"ok": False, "error": "Download already in progress"}), 409
    body = request.get_json(silent=True) or {}
    try:
        if "center" in body:
            c = body["center"]
            radius_km = float(body.get("radius_km", 2.0))
            min_lat, max_lat, min_lon, max_lon = _bbox_from_center_radius(
                float(c["lat"]), float(c["lon"]), radius_km
            )
        else:
            bbox = body["bbox"]
            min_lat, max_lat = float(bbox["min_lat"]), float(bbox["max_lat"])
            min_lon, max_lon = float(bbox["min_lon"]), float(bbox["max_lon"])
        min_zoom = int(body.get("min_zoom", 12))
        max_zoom = int(body.get("max_zoom", 18))
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"ok": False, "error": f"Invalid params: {e}"}), 400

    t = threading.Thread(
        target=_download_worker,
        args=(min_lat, max_lat, min_lon, max_lon, min_zoom, max_zoom),
        daemon=True,
    )
    t.start()
    return jsonify({"ok": True, "started": True})


@app.get("/tiles/download/status")
def tile_download_status():
    with _download_lock:
        return jsonify({"ok": True, **_download_state})


if __name__ == "__main__":
    print("Dev stub server running on http://localhost:5000")
    print(f"  Fake rover at ({_BASE_LAT}, {_BASE_LON}), slowly circling")
    print("  Heading rotates 0→360° every 60s")
    print("  Tiles: local cache + MapTiler CDN fallback")
    app.run(host="0.0.0.0", port=5000, debug=False)
