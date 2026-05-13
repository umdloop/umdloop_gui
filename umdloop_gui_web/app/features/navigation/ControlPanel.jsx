"use client";

import React, { useState } from "react";
import { sendPathPlan } from "../../lib/api";

export default function ControlPanel() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [navMode, setNavMode] = useState("GNSS");
  const [pathPlanStatus, setPathPlanStatus] = useState("");
  const [error, setError] = useState("");

  const onPathPlan = async () => {
    console.log("Path plan clicked", { latitude, longitude, navMode });
    try {
      setError("");
      setPathPlanStatus("Sending...");

      const data = await sendPathPlan({
        latitude: Number(latitude),
        longitude: Number(longitude),
        positionTolerance: 0.0,
        mode: navMode,
      });

      if (data.ok === false) {
        setPathPlanStatus("");
        setError(data.error || data.message || "Path plan failed");
        return;
      }

      setPathPlanStatus(data.message || "Request sent");
    } catch (_) {
      setPathPlanStatus("");
      setError("Backend unreachable");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          padding: "18px 20px",
          borderRadius: "14px",
          border: "2px solid #1f1e1eff",
          background: "#2b2b2b",
          color: "white",
          width: "520px",
          textAlign: "left",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Control Panel</h2>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Latitude</label>
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 38.4239116" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", outline: "none" }} />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Longitude</label>
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. -110.7849055" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", outline: "none" }} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Mode</div>

          {["GNSS", "Object Detection", "Aruco Tag"].map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "12px",
                border: "2px solid #1f1e1eff",
                background: navMode === opt ? "#262626ff" : "#3d3d3d",
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              <input type="radio" name="navMode" value={opt} checked={navMode === opt} onChange={() => setNavMode(opt)} style={{ transform: "scale(1.2)" }} />
              <span style={{ fontWeight: 800 }}>{opt}</span>
            </label>
          ))}
        </div>

        <div style={{ marginTop: 6, opacity: 0.9 }}>
          <button
            onClick={onPathPlan}
            style={{
              marginTop: "18px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "9999px",
              border: "2px solid #1f1e1eff",
              background: "#530000ff",
              color: "white",
              fontWeight: 900,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Path Plan
          </button>
          {pathPlanStatus ? <div style={{ marginTop: "10px", color: "#d8d8d8", fontWeight: 700 }}>{pathPlanStatus}</div> : null}
          {error ? <div style={{ marginTop: "6px", color: "#ffb3b3", fontWeight: 700 }}>{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
