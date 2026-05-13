"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

const SCIENCE_CAMERA_ROLES = [CAMERA_ROLES.SCIENCE_1, CAMERA_ROLES.SCIENCE_2, CAMERA_ROLES.SCIENCE_3];

function CameraImage({ cameraId, alt, rotateDeg, style, ...imageProps }) {
  return (
    <CameraFeed
      role={cameraId}
      label={alt}
      rotateDeg={rotateDeg}
      style={style}
      {...imageProps}
    />
  );
}

const cameraBySlot = (slot) => {
  if (slot >= 7 && slot <= 9) return SCIENCE_CAMERA_ROLES[slot - 7];
  return SCIENCE_CAMERA_ROLES[slot % SCIENCE_CAMERA_ROLES.length];
};

export default function Scientist2Tab2({
  selectedScienceTab,
  stopwatchElapsedMs,
  stopwatchRunning,
  formatStopwatch,
  startStopwatch,
  pauseStopwatch,
  resetStopwatch,
  cameraRotateDeg,
  setFullscreenCam,
}) {
  const tab2NightVisionCamera = { label: "Nightvision Camera", id: cameraBySlot(7) };

  return (
    <div style={{ padding: "12px", height: "100%", minHeight: 0, background: "#1a1a1a", overflow: "auto" }}>
      <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto auto repeat(3, minmax(0, 1fr))", gap: "10px", minHeight: "100%" }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: "20px", textAlign: "center", letterSpacing: "0.02em" }}>
          {selectedScienceTab}
        </div>
        <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "8px" }}>
          <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Stopwatch
          </div>
          <div style={{ color: "white", fontSize: "28px", fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
            {formatStopwatch(stopwatchElapsedMs)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
            <button
              onClick={stopwatchRunning ? pauseStopwatch : startStopwatch}
              style={{ borderRadius: "8px", border: "1px solid #555", background: stopwatchRunning ? "#6d1111" : "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
            >
              {stopwatchRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={resetStopwatch}
              style={{ borderRadius: "8px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
            >
              Reset
            </button>
          </div>
        </div>
        {["Site 1", "Site 2"].map((siteLabel) => (
          <div key={siteLabel} style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
            <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Fluoro Data
            </div>
            <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>
              {siteLabel}
            </div>
            <div style={{ borderRadius: "8px", border: "1px solid #444", background: "#171717", display: "grid", placeItems: "center", color: "#b7b7b7", fontWeight: 700, minHeight: 0 }}>
              Fluorescence analysis placeholder
            </div>
          </div>
        ))}
        <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
          <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Camera Feed
          </div>
          <div style={{ color: "white", fontSize: "20px", fontWeight: 800, lineHeight: 1.15 }}>
            Nightvision Camera inside science box
          </div>
          <CameraImage
            cameraId={tab2NightVisionCamera.id}
            alt={tab2NightVisionCamera.label}
            rotateDeg={cameraRotateDeg}
            onClick={() => setFullscreenCam(tab2NightVisionCamera)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "8px",
              background: "black",
              cursor: "pointer",
              transform: `rotate(${cameraRotateDeg}deg)`,
              transformOrigin: "center center",
            }}
            pausedStyle={{ fontSize: "12px" }}
          />
        </div>
      </div>
    </div>
  );
}
