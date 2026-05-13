import sys
import random
from PySide6 import QtCore, QtGui
from PySide6.QtWidgets import QApplication, QPushButton, QVBoxLayout, QWidget
from PySide6.QtMultimedia import QMediaDevices, QCamera, QCameraDevice, QMediaCaptureSession, QVideoSink
from PySide6.QtMultimediaWidgets import QVideoWidget
from PySide6.QtCore import Qt

class CameraToggle(QWidget):
    def __init__(self):
        super().__init__()
        
        self.current_cam_index = 0

        # Create layout and wisget objects
        self.layout = QVBoxLayout()
        self.button = QPushButton(f"Toggle to Cam {self.current_cam_index+1}")
        self.video_widget = QVideoWidget()
        
        # Add toggle switch widget
        self.button.setFixedSize(120, 60)
        self.button.clicked.connect(self.toggle_switch)
        self.layout.addWidget(self.button)

        # Initial camera setup
        self.camera_setup()

        self.setLayout(self.layout)

    def toggle_switch(self):
        # Get rid of current camera, switch to other, set that one up
        self.layout.removeWidget(self.video_widget)
        self.current_cam_index += 1
        self.camera_setup()


    def camera_setup(self):
        # Find cameras
        self.cameras = QMediaDevices.videoInputs()
        if not self.cameras:
            print("No cameras found.")
            return
        self.camera_count = len(self.cameras)

        # Determine which camera we want to use
        if(self.current_cam_index == self.camera_count):
            self.current_cam_index = 0
        self.button.setText(f"Toggle to Cam: {self.current_cam_index+1}")

        # Create a widget for the camera
        self.layout.addWidget(self.video_widget)
        self.camera_device = self.cameras[self.current_cam_index] # Use the camera you toggled to
        self.camera = QCamera(self.camera_device)
        self.capture_session = QMediaCaptureSession()
        self.capture_session.setCamera(self.camera)
        self.capture_session.setVideoOutput(self.video_widget)
        self.camera.start()

if __name__ == "__main__":
    app = QApplication([])

    widget = CameraToggle()
    widget.resize(800, 600)
    widget.show()

    sys.exit(app.exec())