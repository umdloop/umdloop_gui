"use client";

import React, { useEffect, useState } from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES } from "../../config";

const EQUIPMENT_CAMERAS = [
  { label: "Equipment Cam 1", role: CAMERA_ROLES.SCIENCE_1 },
  { label: "Equipment Cam 2", role: CAMERA_ROLES.SCIENCE_2 },
  { label: "Equipment Cam 3", role: CAMERA_ROLES.SCIENCE_3 },
  { label: "Equipment Cam 4", role: null },
  { label: "Equipment Cam 5", role: null },
];

export default function EquipmentOperatorView() {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [showCameraManager, setShowCameraManager] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "10px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowCameraManager(true)}
          style={{
            borderRadius: "9999px",
            border: "2px solid #0f2f55",
            background: "#1a3f6f",
            color: "white",
            cursor: "pointer",
            padding: "7px 16px",
            fontSize: "12px",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          Camera Manager
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          minHeight: 0,
        }}
      >
        {EQUIPMENT_CAMERAS.map((cam) => (
          <CameraFeed
            key={cam.label}
            role={cam.role}
            label={cam.label}
            onClick={() => setFullscreenCam(cam)}
            style={{ width: "100%", height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
          />
        ))}
      </div>

      {fullscreenCam && (
        <div
          onClick={() => setFullscreenCam(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
          <CameraFeed
            role={fullscreenCam.role}
            label={fullscreenCam.label}
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              width: "min(1280px, 96vw)",
              height: "80vh",
              borderRadius: "12px",
              background: "black",
            }}
          />
        </div>
      )}

      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </div>
  );
}
