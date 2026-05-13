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

function CameraCard({ camera, rotateDeg, onOpenCamera }) {
  return (
    <div
      onClick={() => onOpenCamera(camera)}
      style={{
        background: "#2b2b2b",
        borderRadius: "10px",
        border: "1px solid #3d3d3d",
        padding: "5px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#c90202";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#3d3d3d";
      }}
    >
      <h4 style={{ color: "white", fontSize: "10px", fontWeight: "bold", textAlign: "center", marginBottom: "3px" }}>
        {camera.label} {camera.id ? `(${camera.id})` : "(No Cam)"}
      </h4>
      <CameraImage
        cameraId={camera.id}
        alt={camera.label}
        rotateDeg={rotateDeg}
        style={{
          width: "100%",
          flex: 1,
          objectFit: "cover",
          borderRadius: "6px",
          background: "black",
          minHeight: 0,
          transform: `rotate(${rotateDeg}deg)`,
          transformOrigin: "center center",
        }}
        pausedStyle={{ fontSize: "12px" }}
      />
    </div>
  );
}

const cameraBySlot = (slot) => {
  if (slot >= 7 && slot <= 9) return SCIENCE_CAMERA_ROLES[slot - 7];
  return SCIENCE_CAMERA_ROLES[slot % SCIENCE_CAMERA_ROLES.length];
};

export default function DefaultScienceView({
  selectedScienceTab,
  cameraRotateDeg,
  setFullscreenCam,
  panoramaShots,
  setPanoramaShots,
  sciencePhotos,
  setSciencePhotos,
  lastPanoramaLabel,
  setLastPanoramaLabel,
  setSciencePopup,
}) {
  const scienceCameras = [
    { label: `${selectedScienceTab} Cam 1`, id: cameraBySlot(7) },
    { label: `${selectedScienceTab} Cam 2`, id: cameraBySlot(8) },
    { label: `${selectedScienceTab} Cam 3`, id: cameraBySlot(9) },
  ];

  const graphBar = (value, color) => (
    <div style={{ height: "8px", background: "#252525", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color }} />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>{selectedScienceTab} Imaging / Capture</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setPanoramaShots((n) => {
                const next = n + 1;
                setLastPanoramaLabel(`Panorama #${next} captured at ${new Date().toLocaleTimeString()}`);
                return next;
              })}
              style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}
            >
              Panorama
            </button>
            <button onClick={() => setSciencePhotos((n) => n + 1)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Take Picture</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
            <button onClick={() => setSciencePopup("panorama")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#2f2f2f", color: "white", cursor: "pointer", fontWeight: 700 }}>
              Open Panorama Popup
            </button>
            <button onClick={() => setSciencePopup("tasks")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#2f2f2f", color: "white", cursor: "pointer", fontWeight: 700 }}>
              Additional Science Tasks
            </button>
          </div>
          <div style={{ marginTop: "6px", color: "#ddd", fontSize: "11px" }}>
            Panoramas: {panoramaShots} | Photos: {sciencePhotos}
          </div>
          <div style={{ marginTop: "4px", color: "#8f8f8f", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lastPanoramaLabel}
          </div>
        </div>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>{selectedScienceTab} Data Graphs</div>
          <div style={{ display: "grid", gap: "6px" }}>
            <button onClick={() => setSciencePopup("soil")} style={{ textAlign: "left", borderRadius: "6px", border: "1px solid #4d4d4d", background: "#2d2d2d", color: "#cfcfcf", fontSize: "10px", padding: "6px", cursor: "pointer" }}>
              Soil Moisture (Open Popup)
              <div style={{ marginTop: "5px" }}>{graphBar(72, "#16a34a")}</div>
            </button>
            <button onClick={() => setSciencePopup("spectral")} style={{ textAlign: "left", borderRadius: "6px", border: "1px solid #4d4d4d", background: "#2d2d2d", color: "#cfcfcf", fontSize: "10px", padding: "6px", cursor: "pointer" }}>
              Spectral Intensity (Open Popup)
              <div style={{ marginTop: "5px" }}>{graphBar(48, "#2563eb")}</div>
            </button>
            <div style={{ fontSize: "10px", color: "#cfcfcf" }}>Thermal Delta</div>
            {graphBar(35, "#f97316")}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
        <CameraCard camera={scienceCameras[0]} rotateDeg={cameraRotateDeg} onOpenCamera={setFullscreenCam} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          <CameraCard camera={scienceCameras[1]} rotateDeg={cameraRotateDeg} onOpenCamera={setFullscreenCam} />
          <CameraCard camera={scienceCameras[2]} rotateDeg={cameraRotateDeg} onOpenCamera={setFullscreenCam} />
        </div>
      </div>
    </div>
  );
}
