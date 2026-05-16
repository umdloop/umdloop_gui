"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

export default function ArmView({
  setFullscreenCam,
  getCameraRotation,
  emergencyStop,
  setEmergencyStop,
  setShowCameraManager,
}) {
  const armCameras = [
    { label: "Base Arm", role: CAMERA_ROLES.ARM_BASE },
    { label: "Joint", role: CAMERA_ROLES.ARM_JOINT },
    { label: "End Effector", role: CAMERA_ROLES.ARM_EE },
    { label: "Gripper", role: CAMERA_ROLES.ARM_GRIPPER },
  ];

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "flex" }}>
          <button
            onClick={() => setEmergencyStop((prev) => !prev)}
            style={{ flex: 1, borderRadius: "8px", border: "1px solid #803737", padding: "8px 10px", cursor: "pointer", background: emergencyStop ? "#d11f1f" : "#a31616", color: "white", fontWeight: 900, fontSize: "16px" }}
          >
            {emergencyStop ? "E-STOP ON" : "Emergency Stop"}
          </button>
        </div>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {["Cylindrical Control", "Joint By Joint"].map((controlMode) => (
              <button
                key={controlMode}
                type="button"
                style={{
                  minHeight: "46px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#303030",
                  color: "#d8d8d8",
                  cursor: "pointer",
                  fontWeight: 900,
                  padding: "8px",
                }}
              >
                {controlMode}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCameraManager(true)}
            style={{
              minHeight: "40px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#1a3f6f",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              padding: "8px",
              fontSize: "12px",
            }}
          >
            Camera Manager
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
        {armCameras.map((cam) => (
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
  );
}
