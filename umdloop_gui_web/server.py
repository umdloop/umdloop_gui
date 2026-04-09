import base64
import json
import os
import re
import signal
import ssl
import subprocess
import sys
import time
from urllib import error as urllib_error
from urllib import request as urllib_request

import cv2
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from ros_bridge import RosUnavailableError, ros_context


app = Flask(__name__)
CORS(app)
process = None

MIKROTIK_HOST = os.getenv("MIKROTIK_HOST", "").strip()
MIKROTIK_USER = os.getenv("MIKROTIK_USER", "").strip()
MIKROTIK_PASS = os.getenv("MIKROTIK_PASS", "")
MIKROTIK_ENDPOINT = os.getenv("MIKROTIK_ENDPOINT", "").strip()
MIKROTIK_VERIFY_TLS = os.getenv("MIKROTIK_VERIFY_TLS", "false").lower() in {"1", "true", "yes", "on"}
MIKROTIK_CACHE_TTL_SEC = float(os.getenv("MIKROTIK_CACHE_TTL_SEC", "1.5"))
MIKROTIK_DEFAULT_ENDPOINTS = [
    "interface/wireless/registration-table/print",
    "interface/wifi/registration-table/print",
]
_radio_status_cache = {"timestamp": 0.0, "value": None}


def _clamp(value, low, high):
    return max(low, min(high, value))


def _empty_radio_status(error=None, source="unavailable"):
    return {
        "connected": False,
        "quality_percent": 0,
        "rssi_dbm": None,
        "tx_ccq": None,
        "rx_ccq": None,
        "source": source,
        "error": error,
    }


def _parse_metric(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    if not match:
        return None
    return float(match.group(0))


def _source_label(endpoint):
    if "interface/wifi/" in endpoint:
        return "wifi registration table"
    if "interface/wireless/" in endpoint:
        return "wireless registration table"
    return endpoint


def _compute_quality_percent(rssi_dbm, tx_ccq, rx_ccq):
    components = []

    if rssi_dbm is not None:
        signal_score = ((rssi_dbm + 90.0) / 40.0) * 100.0
        components.append(_clamp(signal_score, 0.0, 100.0))
    if tx_ccq is not None:
        components.append(_clamp(tx_ccq, 0.0, 100.0))
    if rx_ccq is not None:
        components.append(_clamp(rx_ccq, 0.0, 100.0))

    if not components:
        return 0

    return int(round(sum(components) / len(components)))


def _normalize_registration_row(row, endpoint):
    tx_rx_ccq = row.get("tx/rx-ccq")
    tx_rx_parts = re.findall(r"-?\d+(?:\.\d+)?", str(tx_rx_ccq)) if tx_rx_ccq is not None else []

    tx_ccq = _parse_metric(row.get("tx-ccq"))
    rx_ccq = _parse_metric(row.get("rx-ccq"))
    if tx_ccq is None and tx_rx_parts:
        tx_ccq = float(tx_rx_parts[0])
    if rx_ccq is None and len(tx_rx_parts) > 1:
        rx_ccq = float(tx_rx_parts[1])

    rssi_dbm = None
    for key in ("signal-strength", "signal", "rx-signal", "signal-strength-ch0"):
        rssi_dbm = _parse_metric(row.get(key))
        if rssi_dbm is not None:
            break

    return {
        "connected": True,
        "quality_percent": _compute_quality_percent(rssi_dbm, tx_ccq, rx_ccq),
        "rssi_dbm": rssi_dbm,
        "tx_ccq": tx_ccq,
        "rx_ccq": rx_ccq,
        "source": _source_label(endpoint),
        "error": None,
    }


def _mikrotik_rest_post(endpoint):
    if not MIKROTIK_HOST or not MIKROTIK_USER or not MIKROTIK_PASS:
        raise RuntimeError("Set MIKROTIK_HOST, MIKROTIK_USER, and MIKROTIK_PASS to enable radio telemetry")

    url = f"https://{MIKROTIK_HOST}/rest/{endpoint.lstrip('/')}"
    req = urllib_request.Request(url, data=b"{}", method="POST")
    token = base64.b64encode(f"{MIKROTIK_USER}:{MIKROTIK_PASS}".encode("utf-8")).decode("ascii")
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")

    ssl_context = None if MIKROTIK_VERIFY_TLS else ssl._create_unverified_context()
    with urllib_request.urlopen(req, timeout=2.0, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
        if not payload:
            return []
        return json.loads(payload)


def get_mikrotik_radio_status():
    now = time.time()
    cached = _radio_status_cache["value"]
    if cached is not None and now - _radio_status_cache["timestamp"] < MIKROTIK_CACHE_TTL_SEC:
        return cached

    endpoints = [MIKROTIK_ENDPOINT] if MIKROTIK_ENDPOINT else list(MIKROTIK_DEFAULT_ENDPOINTS)
    errors = []

    for endpoint in endpoints:
        try:
            payload = _mikrotik_rest_post(endpoint)
        except urllib_error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            if exc.code == 404:
                errors.append(f"{endpoint}: not supported")
                continue
            status = _empty_radio_status(
                error=f"{endpoint}: HTTP {exc.code} {body}".strip(),
                source=_source_label(endpoint),
            )
            _radio_status_cache.update({"timestamp": now, "value": status})
            return status
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")
            continue

        if isinstance(payload, dict):
            rows = payload.get("data") or payload.get("ret") or [payload]
        elif isinstance(payload, list):
            rows = payload
        else:
            rows = []

        if rows:
            status = _normalize_registration_row(rows[0], endpoint)
        else:
            status = _empty_radio_status(error="No registered MikroTik peers found", source=_source_label(endpoint))

        _radio_status_cache.update({"timestamp": now, "value": status})
        return status

    status = _empty_radio_status(error="; ".join(errors) if errors else "Unable to query MikroTik radio", source="unavailable")
    _radio_status_cache.update({"timestamp": now, "value": status})
    return status


def video_stream(camera_index=0):
    cap = cv2.VideoCapture(camera_index)  # 0 = default webcam
    while True:
        read_success, frame = cap.read()
        if not read_success:
            break
        else:
            encode_success, buffer = cv2.imencode('.jpg', frame) # encode frame to JPEG
            if not encode_success:
                continue
            else:
                frame = buffer.tobytes() # convert to bytes
                yield (b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/camera/<int:cam_id>')
def video_feed(cam_id):
    return Response(video_stream(cam_id),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "umdloop_gui_native", "best.pt"))
model = YOLO(MODEL_PATH)

def annotated_stream(camera_index=0):
    cap = cv2.VideoCapture(camera_index)
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        results = model(frame, verbose=False)

        # draw boxes on frame
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                name = model.names.get(cls_id, str(cls_id))

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
                cv2.putText(frame, f"{name} {conf:.2f}", (x1, max(y1-10, 0)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)

        # encode frame to jpg
        ok, buffer = cv2.imencode(".jpg", frame)
        if not ok:
            continue

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

    cap.release()

@app.get("/object-detection/stream/0")
def object_detection_stream(cam_id=0):
    return Response(
        annotated_stream(cam_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/object-detection/start")
def start_detection():
    global process
    if process is not None and process.poll() is None:
        return jsonify({"ok": True, "status": "already_running"}), 200

    
    script_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "umdloop_gui_native", "yolo_live_logger.py")
    )

    if not os.path.exists(script_path):
        return jsonify({"ok": False, "error": f"Script not found: {script_path}"}), 500

    
    process = subprocess.Popen(
        [sys.executable, script_path],
        cwd=os.path.dirname(script_path),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    return jsonify({"ok": True, "status": "started", "pid": process.pid}), 200

@app.post("/object-detection/stop")
def stop_detection():
    global process
    if process is None or process.poll() is not None:
        process = None
        return jsonify({"ok": True, "status": "not_running"}), 200

    # Try graceful stop 
    try:
        process.terminate()  
        process.wait(timeout=3)
    except Exception:
        pass

    #If still alive, force kill the whole tree (Windows guaranteed)
    if process.poll() is None:
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass

    process = None
    return jsonify({"ok": True, "status": "stopped"}), 200


@app.get("/radio/status")
def radio_status():
    status = get_mikrotik_radio_status()
    return jsonify({"ok": True, **status}), 200


@app.get("/object-detection/status")
def status():
    global process
    running = process is not None and process.poll() is None
    return jsonify({"ok": True, "running": running}), 200


@app.post("/navigation/path-plan")
def navigation_path_plan():
    data = request.get_json(silent=True) or {}
    app.logger.warning(f"/navigation/path-plan payload={data}")

    # UI -> BT mapping
    ui_mode = data.get("mode", "GNSS")
    mode_map = {
        "GNSS": "GNSS",
        "Object Detection": "ObjectDetection",
        "Aruco Tag": "ArucoDetection",
    }
    bt_mode = mode_map.get(ui_mode)
    if not bt_mode:
        return jsonify({"ok": False, "error": f"Unknown mode '{ui_mode}'"}), 400

    # start ROS once
    try:
        ros_context.start()
    except RosUnavailableError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503

    # 1) publish nav mode for BT router
    ros_context.node.publish_nav_mode(bt_mode)

    # optional: give BT a tiny moment to switch blackboard/subtree
    # (usually not necessary, but helpful if you see race conditions)
    # time.sleep(0.1)

    # 2) GNSS goal only makes sense when GNSS subtree is used (GNSS or ArucoDetection sequence)
    # If you want coordinates to still be sent for ArucoDetection (your tree does GNSS then Aruco), allow both.
    if bt_mode in ("GNSS", "ArucoDetection"):
        try:
            lat = float(data["latitude"])
            lon = float(data["longitude"])
            tol = float(data.get("position_tolerance", 0.0))
        except Exception:
            return jsonify({"ok": False, "error": "Invalid latitude/longitude"}), 400

        accepted, success, msg = ros_context.node.send_gps_goal_blocking(lat, lon, tol)
        return jsonify({
            "ok": True,
            "nav_mode": bt_mode,
            "goal_sent": True,
            "accepted": accepted,
            "success": success,
            "message": msg
        })

    # ObjectDetection mode: only publish mode; BT handles rest
    return jsonify({
        "ok": True,
        "nav_mode": bt_mode,
        "goal_sent": False,
        "message": "nav_mode published; no GNSS goal sent for ObjectDetection"
    })


if __name__ == "__main__":
    # exposes to all network interfaces, run app in debug mode on port 5000
    app.run(host='0.0.0.0', debug=True, use_reloader=False)
