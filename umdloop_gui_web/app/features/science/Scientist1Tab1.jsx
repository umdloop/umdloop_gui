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

export default function Scientist1Tab1({
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
  const scientist1Cameras = [
    { label: "Nightvision Camera", id: cameraBySlot(7) },
    { label: "Rover Field View", id: cameraBySlot(9) },
  ];

  return (
    <div style={{ padding: "12px", height: "100%", minHeight: 0, background: "#1a1a1a", overflow: "auto" }}>
      <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "10px", minHeight: "100%" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
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
            <button
              onClick={() => setFullscreenCam(scientist1Cameras[0])}
              style={{ borderRadius: "8px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
            >
              Expand Top
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateRows: `repeat(${scientist1Cameras.length}, minmax(220px, 1fr))`, gap: "10px", minHeight: 0 }}>
          {scientist1Cameras.map((camera) => (
            <div key={camera.label} style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Camera Feed
              </div>
              <div style={{ color: "white", fontSize: "20px", fontWeight: 800, lineHeight: 1.15 }}>
                {camera.label}
              </div>
              <CameraImage
                cameraId={camera.id}
                alt={camera.label}
                rotateDeg={cameraRotateDeg}
                onClick={() => setFullscreenCam(camera)}
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
          ))}
        </div>
      </div>
    </div>
  );
}
