import cv2
from flask import Flask, Response

app = Flask(__name__)

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

if __name__ == "__main__":
    # exposes to all network interfaces, run app in debug mode on port 5000
    app.run(host='0.0.0.0', debug=True)