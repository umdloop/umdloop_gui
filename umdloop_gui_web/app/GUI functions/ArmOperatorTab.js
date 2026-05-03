import React from "react";

export default function ArmOperatorTab({
  armClampDistance,
  cameraBySlot,
  CameraCard,
  emergencyStop,
  FullscreenOverlay,
  setArmClampDistance,
  setEmergencyStop,
}) {
  const armCameras = [
    { label: "Base Arm", id: cameraBySlot(4) },
    { label: "Joint", id: cameraBySlot(5) },
    { label: "End Effector", id: cameraBySlot(6) },
    { label: "Gripper", id: cameraBySlot(7) },
  ];

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
        {armCameras.map((cam) => <CameraCard key={cam.label} camera={cam} />)}
      </div>
      <FullscreenOverlay />
    </div>
  );
}
