import cv2
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import subprocess
import os
import signal
import sys
from ultralytics import YOLO
from ros_bridge import ros_context


app = Flask(__name__)
CORS(app)
process = None

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
    ros_context.start()

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