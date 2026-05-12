"""Camera endpoints — MJPEG streaming and object detection.

Ported from the prior Flask server.py.
"""

from __future__ import annotations

import os
import subprocess
import sys
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()

_process: Optional[subprocess.Popen] = None

MODEL_PATH = os.environ.get(
    "UMDLOOP_YOLO_MODEL_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "best.pt")),
)


def _get_cv2():
    """Lazy-import cv2."""
    import cv2
    return cv2


def _get_model():
    """Lazy-load the YOLO model."""
    if not hasattr(_get_model, "_instance"):
        from ultralytics import YOLO
        _get_model._instance = YOLO(MODEL_PATH)
    return _get_model._instance


def _video_stream(camera_index: int = 0):
    """Generate MJPEG frames from a camera."""
    cv2 = _get_cv2()
    cap = cv2.VideoCapture(camera_index)
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            ok, buffer = cv2.imencode(".jpg", frame)
            if not ok:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
    finally:
        cap.release()


def _annotated_stream(camera_index: int = 0):
    """Generate MJPEG frames with YOLO object detection annotations."""
    cv2 = _get_cv2()
    model = _get_model()
    cap = cv2.VideoCapture(camera_index)
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            results = model(frame, verbose=False)
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = model.names.get(cls_id, str(cls_id))
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        f"{name} {conf:.2f}",
                        (x1, max(y1 - 10, 0)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2,
                    )

            ok, buffer = cv2.imencode(".jpg", frame)
            if not ok:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
    finally:
        cap.release()


@router.get("/camera/{cam_id}")
async def video_feed(cam_id: int):
    """MJPEG stream from the specified camera index."""
    return StreamingResponse(
        _video_stream(cam_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/object-detection/stream/0")
async def object_detection_stream():
    """MJPEG stream with YOLO annotations from camera 0."""
    return StreamingResponse(
        _annotated_stream(0),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/object-detection/start")
async def start_detection():
    """Start the YOLO live logger subprocess."""
    global _process
    if _process is not None and _process.poll() is None:
        return JSONResponse({"ok": True, "status": "already_running"})

    script_path = os.environ.get(
        "UMDLOOP_YOLO_LOGGER_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "yolo_live_logger.py")),
    )
    if not os.path.exists(script_path):
        return JSONResponse({"ok": False, "error": f"Script not found: {script_path}"}, status_code=500)

    _process = subprocess.Popen(
        [sys.executable, script_path],
        cwd=os.path.dirname(script_path),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return JSONResponse({"ok": True, "status": "started", "pid": _process.pid})


@router.post("/object-detection/stop")
async def stop_detection():
    """Stop the YOLO live logger subprocess."""
    global _process
    if _process is None or _process.poll() is not None:
        _process = None
        return JSONResponse({"ok": True, "status": "not_running"})

    try:
        _process.terminate()
        _process.wait(timeout=3)
    except Exception:
        pass

    if _process.poll() is None:
        try:
            import signal
            os.kill(_process.pid, signal.SIGKILL)
        except Exception:
            pass

    _process = None
    return JSONResponse({"ok": True, "status": "stopped"})


@router.get("/object-detection/status")
async def detection_status():
    """Check if the YOLO live logger is running."""
    running = _process is not None and _process.poll() is None
    return JSONResponse({"ok": True, "running": running})
