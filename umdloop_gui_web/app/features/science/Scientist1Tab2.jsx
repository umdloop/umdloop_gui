"use client";

import React from "react";
import RamanPlot from "../../../spectrometer/RamanPlot";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

const RAMAN_WS_URL = "ws://192.168.88.90:5001/ws/spectrum";
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

export default function Scientist1Tab2({
  selectedScienceTab,
  cameraRotateDeg,
  setFullscreenCam,
}) {
  const tab2NightVisionCamera = { label: "Nightvision Camera", id: cameraBySlot(7) };

  return (
    <div style={{ padding: "12px", height: "100%", minHeight: 0, background: "#1a1a1a", overflow: "auto" }}>
      <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto repeat(4, minmax(0, 1fr))", gap: "10px", minHeight: "100%" }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: "20px", textAlign: "center", letterSpacing: "0.02em" }}>
          {selectedScienceTab}
        </div>
        <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
          <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Stratigraphic Profile Image
          </div>
          <div style={{ borderRadius: "8px", border: "1px solid #4a4a4a", background: "linear-gradient(180deg, #6b5636 0%, #8a6b40 24%, #b48a55 24%, #b48a55 42%, #6e5230 42%, #6e5230 58%, #a17a4b 58%, #a17a4b 74%, #54412a 74%, #54412a 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.78)", fontWeight: 800, minHeight: 0 }}>
            Profile placeholder
          </div>
        </div>
        <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
          <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Spectro Data
          </div>
          <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>
            Site 1
          </div>
          <div style={{ minHeight: 0, borderRadius: "8px", overflow: "hidden", border: "1px solid #444", background: "#171717", padding: "8px" }}>
            <RamanPlot wsUrl={RAMAN_WS_URL} width={1200} height={220} fillContainer />
          </div>
        </div>
        <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
          <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Spectro Data
          </div>
          <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>
            Site 2
          </div>
          <div style={{ minHeight: 0, borderRadius: "8px", overflow: "hidden", border: "1px solid #444", background: "#171717", padding: "8px" }}>
            <RamanPlot wsUrl={RAMAN_WS_URL} width={1200} height={220} fillContainer />
          </div>
        </div>
        <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
          <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Camera Feed
          </div>
          <div style={{ color: "white", fontSize: "20px", fontWeight: 800, lineHeight: 1.15 }}>
            Nightvision Camera
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
