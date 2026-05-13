"use client";

import React, { useEffect, useState } from "react";
import RamanPlot from "../../../spectrometer/RamanPlot";
import CameraFeed from "../../components/camera/CameraFeed";
import MissionPanel from "../../components/mission/MissionPanel";
import { CAMERA_ROLES } from "../../config";

const RAMAN_WS_URL = "ws://localhost:5001/ws/spectrum";

export default function ScienceView({
  selectedSubsystem,
  setSelectedSubsystem,
  setFullscreenCam,
  getCameraRotation,
  setShowCameraManager,
}) {
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [sciencePopup, setSciencePopup] = useState(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setSciencePopup(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const scienceCameras = [
    { label: "Science Cam 1", role: CAMERA_ROLES.SCIENCE_1 },
    { label: "Science Cam 2", role: CAMERA_ROLES.SCIENCE_2 },
    { label: "Science Cam 3", role: CAMERA_ROLES.SCIENCE_3 },
  ];

  const graphBar = (value, color) => (
    <div style={{ height: "8px", background: "#252525", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color }} />
    </div>
  );

  const SciencePopupOverlay = () => {
    if (!sciencePopup) return null;

    let title = "";
    let body = null;

    if (sciencePopup === "panorama") {
      title = "Panorama Preview";
      body = (
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ height: 200, background: "#111", borderRadius: 10, border: "1px solid #444" }} />
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>{lastPanoramaLabel}</div>
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Placeholder preview panel. Stitching/export will be wired later.</div>
        </div>
      );
    } else if (sciencePopup === "tasks") {
      title = "Additional Science Tasks";
      const taskItems = [
        "Soil Core Collection",
        "Rock Face Classification",
        "Sample Bag Labeling",
        "Drill Site Annotation",
        "Spectrometer Calibration",
      ];
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          {taskItems.map((task) => (
            <button
              key={task}
              style={{ textAlign: "left", borderRadius: "8px", border: "1px solid #555", background: "#2d2d2d", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 700 }}
            >
              {task}
            </button>
          ))}
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Task actions are UI placeholders for now.</div>
        </div>
      );
    } else if (sciencePopup === "soil") {
      title = "Soil Moisture Analysis";
      const points = [28, 34, 41, 39, 44, 48, 52];
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>Probe trend over last 7 reads</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", alignItems: "end", height: "150px", background: "#171717", border: "1px solid #444", borderRadius: "8px", padding: "10px" }}>
            {points.map((p, i) => (
              <div key={`soil-${i}`} style={{ height: `${p * 2}px`, background: "#16a34a", borderRadius: "4px 4px 0 0" }} title={`T${i + 1}: ${p}%`} />
            ))}
          </div>
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Graph is a placeholder UI panel.</div>
        </div>
      );
    } else if (sciencePopup === "spectral") {
      title = "Raman Spectrum Analysis";
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>
            Live Raman spectrum from spectrometer backend on port 5001
          </div>
          <RamanPlot wsUrl={RAMAN_WS_URL} width={700} height={400} />
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>
            Start with: <code>python3 spectrometer/raman_backend.py</code>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => setSciencePopup(null)}
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(760px, 96vw)", maxHeight: "85vh", overflowY: "auto", background: "#222", border: "1px solid #4a4a4a", borderRadius: "12px", padding: "14px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: "20px" }}>{title}</div>
            <button onClick={() => setSciencePopup(null)} style={{ borderRadius: "8px", border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "6px 10px", fontWeight: 800 }}>Close</button>
          </div>
          {body}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Science Imaging / Capture</div>
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
        </div>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Science Data Graphs</div>
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

      {/* ControlRow */}
      <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <MissionPanel />
        <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
        <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
        <button onClick={() => setSelectedSubsystem?.("Drive (Default)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Default)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
        <button onClick={() => setSelectedSubsystem?.("Drive (Science)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Science)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive Science</button>
        <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Arm" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
        <button onClick={() => setShowCameraManager(true)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#1a3f6f", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}>Camera Manager</button>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
        <CameraFeed
          role={scienceCameras[0].role}
          label={scienceCameras[0].label}
          rotateDeg={getCameraRotation(scienceCameras[0])}
          onClick={() => setFullscreenCam(scienceCameras[0])}
          style={{ height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {scienceCameras.slice(1).map((cam) => (
            <CameraFeed
              key={cam.role}
              role={cam.role}
              label={cam.label}
              rotateDeg={getCameraRotation(cam)}
              onClick={() => setFullscreenCam(cam)}
              style={{ height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
            />
          ))}
        </div>
      </div>
      <SciencePopupOverlay />
    </div>
  );
}
