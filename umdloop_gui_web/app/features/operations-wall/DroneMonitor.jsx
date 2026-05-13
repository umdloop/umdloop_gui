"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { getApiBaseUrl, CAMERA_ROLES } from "../../config";

export default function DroneMonitor({ odomSummary, gps }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 160, borderRadius: 16, overflow: "hidden", border: "2px solid #3b3b3b", background: "#101010" }}>
        <img src={`${getApiBaseUrl()}/object-detection/stream/0`} alt="Drone feed primary" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", top: 8, left: 8, fontSize: 12, fontWeight: 800, color: "#d8ffd8", background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "5px 8px" }}>
          SPD {odomSummary}
        </div>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 160 }}>
        <CameraFeed
          role={CAMERA_ROLES.FRONT}
          label="Front"
          style={{ height: "100%", minHeight: 160, borderRadius: 16, border: "2px solid #3b3b3b" }}
        />
        <div style={{ position: "absolute", top: 8, left: 8, fontSize: 12, fontWeight: 800, color: "#d8ffd8", background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "5px 8px", pointerEvents: "none" }}>
          GPS {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
        </div>
      </div>
    </div>
  );
}
