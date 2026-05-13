"use client";

import React, { useState } from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import MissionPanel from "../../components/mission/MissionPanel";
import { CAMERA_ROLES } from "../../config";

export default function ArmView({
  selectedSubsystem,
  setSelectedSubsystem,
  setFullscreenCam,
  getCameraRotation,
  emergencyStop,
  setEmergencyStop,
  setShowCameraManager,
}) {
  const [armClampDistance, setArmClampDistance] = useState(35);

  const armCameras = [
    { label: "Base Arm", role: CAMERA_ROLES.ARM_BASE },
    { label: "Joint", role: CAMERA_ROLES.ARM_JOINT },
    { label: "End Effector", role: CAMERA_ROLES.ARM_EE },
    { label: "Gripper", role: CAMERA_ROLES.ARM_GRIPPER },
  ];

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Arm Safety</div>
          <div style={{ fontSize: "12px", color: "#e8e8e8" }}>Emergency Stop: <b>{emergencyStop ? "ON" : "OFF"}</b></div>
          <button
            onClick={() => setEmergencyStop((prev) => !prev)}
            style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "8px 10px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
          >
            {emergencyStop ? "E-STOP ON" : "Emergency Stop"}
          </button>
        </div>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "4px", fontWeight: 800 }}>Clamp Distance to Fully Close</div>
            <input type="range" min={0} max={100} value={armClampDistance} onChange={(e) => setArmClampDistance(Number(e.target.value))} style={{ width: "100%" }} />
            <div style={{ color: "white", fontSize: "12px" }}>{armClampDistance}%</div>
          </div>
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
        </div>
      </div>

      {/* ControlRow */}
      <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <MissionPanel />
        <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
        <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
        <button onClick={() => setSelectedSubsystem?.("Drive (Default)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Default)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
        <button onClick={() => setSelectedSubsystem?.("Drive (Science)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Science)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive Science</button>
        <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Arm" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
        <button onClick={() => setShowCameraManager(true)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#1a3f6f", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}>Camera Manager</button>
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
