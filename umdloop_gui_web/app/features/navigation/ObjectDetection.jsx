"use client";

import React from "react";
import useObjectDetection from "../../hooks/useObjectDetection";
import { getApiBaseUrl } from "../../config";

export default function ObjectDetection() {
  const { running, pid, error, fetchStatus, startDetection, stopDetection } = useObjectDetection({ enabled: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: "14px",
          border: "2px solid #1f1e1eff",
          background: "#2b2b2b",
          color: "white",
          width: "fit-content",
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderRadius: "9999px",
            fontWeight: 800,
            background: running ? "#1f7a1f" : "#8a1f1f",
          }}
        >
          {running ? "RUNNING ✅" : "STOPPED ❌"}
        </div>

        <div style={{ opacity: 0.9 }}>
          PID: <span style={{ fontWeight: 700 }}>{pid ?? "—"}</span>
        </div>

        {error && <div style={{ color: "#ffb3b3", fontWeight: 700 }}>{error}</div>}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={startDetection} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
          Start
        </button>
        <button onClick={stopDetection} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
          Stop
        </button>
        <button onClick={fetchStatus} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
          Refresh
        </button>
      </div>

      <div style={{ textAlign: "center" }}>
        <h2>Object Detection Stream</h2>
        <img src={`${getApiBaseUrl()}/object-detection/stream/0`} alt="Object Detection Stream" style={{ width: "640px", height: "480px" }} />
      </div>
    </div>
  );
}
