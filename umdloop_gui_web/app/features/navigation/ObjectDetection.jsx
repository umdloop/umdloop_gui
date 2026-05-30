"use client";

import React, { useState } from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import useYoloDetections from "../../hooks/useYoloDetections";
import { YOLO_CAMERA_MAP } from "../../config";

function prettyRole(role) {
  return String(role || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ObjectDetection() {
  const { goalClass, boxesByIndex, firstHitIndex, indices, rosStatus } = useYoloDetections();
  const [showCameraManager, setShowCameraManager] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: 14,
          border: "2px solid #1f1e1eff",
          background: "#2b2b2b",
          color: "white",
          width: "fit-content",
        }}
      >
        <div style={{ fontWeight: 900 }}>Object Detection</div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 9999,
            fontWeight: 800,
            background: goalClass ? "#1f7a1f" : "#555",
          }}
        >
          {goalClass ? `Target: ${goalClass}` : "No active target"}
        </div>
        <div style={{ opacity: 0.85, fontSize: 13 }}>
          ROS: <span style={{ fontWeight: 700 }}>{rosStatus}</span>
        </div>
        {firstHitIndex != null && (
          <div style={{ color: "#4ade80", fontWeight: 800 }}>
            Found on {prettyRole(YOLO_CAMERA_MAP[firstHitIndex])} camera
          </div>
        )}
        <button
          onClick={() => setShowCameraManager(true)}
          style={{
            marginLeft: "auto",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #555",
            background: "#1a3f6f",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Camera Manager
        </button>
      </div>

      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}

      {/* Camera grid (only the YOLO-mapped cameras) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {indices.map((idx) => {
          const role = YOLO_CAMERA_MAP[idx];
          const isHit = idx === firstHitIndex;
          return (
            <CameraFeed
              key={idx}
              role={role}
              label={prettyRole(role)}
              height={260}
              detection={isHit ? boxesByIndex[idx] : null}
              highlighted={isHit}
            />
          );
        })}
      </div>
    </div>
  );
}
