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


# import cv2
# from flask import Flask, Response

# app = Flask(__name__)

# # Detect all available cameras (non-consecutive indices are okay)
# def detect_cameras(max_index=10):
#     cameras = []
#     for i in range(max_index):
#         cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
#         if cap.isOpened():
#             cameras.append(i)
#         cap.release()
#     return cameras

# available_cameras = detect_cameras()
# #print("Detected camera indices:", available_cameras)

# # Video stream generator
# def video_stream(camera_index):
#     cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
#     if not cap.isOpened():
#         print(f"Camera {camera_index} failed to open")
#         return
#     while True:
#         read_success, frame = cap.read()
#         if not read_success:
#             break
#         encode_success, buffer = cv2.imencode('.jpg', frame)
#         if not encode_success:
#             continue
#         frame = buffer.tobytes()
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

# # Create a route for each detected camera
# for cam_index in available_cameras:
#     route = f"/camera/{cam_index}"

#     def make_route(index):
#         return lambda: Response(video_stream(index),
#                                 mimetype='multipart/x-mixed-replace; boundary=frame')

#     app.add_url_rule(route, f"camera_{cam_index}", make_route(cam_index))

# if __name__ == "__main__":
#     app.run(host='0.0.0.0', debug=True)
