"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

const driveRosCommandPlaceholders = ["ROS2 Command 1", "ROS2 Command 2", "ROS2 Command 3"];

export default function DriveView({
  setFullscreenCam,
  getCameraRotation,
  emergencyStop,
  setEmergencyStop,
  setShowCameraManager,
}) {
  const wheelGroups = [
    { label: "Top Left Wheel", role: CAMERA_ROLES.WHEEL_TL },
    { label: "Top Right Wheel", role: CAMERA_ROLES.WHEEL_TR },
    { label: "Bottom Left Wheel", role: CAMERA_ROLES.WHEEL_BL },
    { label: "Bottom Right Wheel", role: CAMERA_ROLES.WHEEL_BR },
  ];

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", minHeight: 0, height: "100%", background: "#1a1a1a" }}>
      <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
        <button
          onClick={() => setEmergencyStop((prev) => !prev)}
          style={{ width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "7px", cursor: "pointer", background: emergencyStop ? "#d11f1f" : "#a31616", color: "white", fontWeight: 900 }}
        >
          {emergencyStop ? "EMERGENCY STOP ACTIVE" : "Emergency Stop"}
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", marginTop: "8px" }}>
          {driveRosCommandPlaceholders.map((commandLabel) => (
            <button
              key={commandLabel}
              type="button"
              style={{
                minHeight: "42px",
                borderRadius: "8px",
                border: "1px solid #555",
                background: "#303030",
                color: "#d8d8d8",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "10px",
                padding: "6px",
              }}
            >
              {commandLabel}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCameraManager(true)}
            style={{
              minHeight: "42px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#1a3f6f",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "10px",
              padding: "6px",
            }}
          >
            Camera Manager
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0, height: "100%" }}>
        <CameraFeed
          role={CAMERA_ROLES.FRONT}
          label="Front Camera"
          rotateDeg={getCameraRotation({ label: "Front Camera", role: CAMERA_ROLES.FRONT })}
          onClick={() => setFullscreenCam({ label: "Front Camera", role: CAMERA_ROLES.FRONT })}
          style={{ height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {wheelGroups.map((wheel) => (
            <div key={wheel.label} style={{ background: "#2b2b2b", borderRadius: "10px", border: "1px solid #3d3d3d", padding: "4px", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ color: "white", fontSize: "8px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{wheel.label}</div>
              <CameraFeed
                role={wheel.role}
                label={wheel.label}
                rotateDeg={getCameraRotation(wheel)}
                onClick={() => setFullscreenCam({ label: wheel.label, role: wheel.role })}
                style={{ flex: 1, borderRadius: 4, border: "1px solid #3d3d3d", cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", minHeight: 0 }}>
          {[
            { label: "Back Camera", role: CAMERA_ROLES.BACK },
            { label: "Left Side", role: CAMERA_ROLES.LEFT_SIDE },
            { label: "Right Side", role: CAMERA_ROLES.RIGHT_SIDE },
            { label: "Radio View", role: CAMERA_ROLES.RADIO_VIEW },
          ].map((cam) => (
            <CameraFeed
              key={cam.role}
              role={cam.role}
              label={cam.label}
              rotateDeg={getCameraRotation(cam)}
              onClick={() => setFullscreenCam(cam)}
              style={{ height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
