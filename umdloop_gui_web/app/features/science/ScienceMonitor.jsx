"use client";

import React, { useEffect, useRef, useState } from "react";
import RamanPlot from "../../../spectrometer/RamanPlot";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES, SCIENCE_SUBSYSTEMS } from "../../config";
import SubsystemBar from "../../components/layout/SubsystemBar";
import Scientist1Tab1 from "./Scientist1Tab1";
import Scientist1Tab2 from "./Scientist1Tab2";
import Scientist2Tab2 from "./Scientist2Tab2";
import EquipmentSpecialist from "./EquipmentSpecialist";
import DefaultScienceView from "./DefaultScienceView";

const RAMAN_WS_URL = "ws://localhost:5001/ws/spectrum";
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

export default function ScienceMonitor() {
  const [selectedScienceTab, setSelectedScienceTab] = useState(SCIENCE_SUBSYSTEMS[0]);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [sciencePopup, setSciencePopup] = useState(null);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [cameraRotateDeg] = useState(0);
  const stopwatchStartRef = useRef(null);

  const isEquipmentSpecialistTab = selectedScienceTab.startsWith("Equipment Specialist");
  const isScientist1Tab1 = selectedScienceTab === "Scientist 1 Tab 1";
  const isScientist1Tab2 = selectedScienceTab === "Scientist 1 Tab 2";
  const isScientist2Tab2 = selectedScienceTab === "Scientist 2 Tab 2";

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
        setSciencePopup(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!stopwatchRunning) return undefined;

    const intervalId = window.setInterval(() => {
      const startedAt = stopwatchStartRef.current ?? Date.now();
      setStopwatchElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [stopwatchRunning]);

  const formatStopwatch = (elapsedMs) => {
    const totalTenths = Math.floor(elapsedMs / 100);
    const minutes = String(Math.floor(totalTenths / 600)).padStart(2, "0");
    const seconds = String(Math.floor((totalTenths % 600) / 10)).padStart(2, "0");
    const tenths = totalTenths % 10;
    return `${minutes}:${seconds}.${tenths}`;
  };

  const startStopwatch = () => {
    stopwatchStartRef.current = Date.now() - stopwatchElapsedMs;
    setStopwatchRunning(true);
  };

  const pauseStopwatch = () => {
    const startedAt = stopwatchStartRef.current ?? Date.now();
    setStopwatchElapsedMs(Date.now() - startedAt);
    setStopwatchRunning(false);
  };

  const resetStopwatch = () => {
    stopwatchStartRef.current = null;
    setStopwatchElapsedMs(0);
    setStopwatchRunning(false);
  };

  const FullscreenOverlay = () =>
    fullscreenCam && (
      <div
        onClick={() => setFullscreenCam(null)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.95)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}
      >
        <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
        <CameraImage
          cameraId={fullscreenCam.id}
          alt={fullscreenCam.label}
          rotateDeg={cameraRotateDeg}
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            borderRadius: "12px",
            background: "black",
            transform: `rotate(${cameraRotateDeg}deg)`,
            transformOrigin: "center center",
          }}
          pausedStyle={{ width: "min(900px, 90vw)", height: "60vh", fontSize: "18px" }}
        />
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
          <CameraImage
            cameraId={CAMERA_ROLES.SCIENCE_1}
            alt="Latest panorama preview"
            rotateDeg={cameraRotateDeg}
            style={{ width: "100%", maxHeight: "50vh", objectFit: "cover", borderRadius: "10px", border: "1px solid #444", background: "#111" }}
            pausedStyle={{ height: "40vh" }}
          />
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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

  const renderTabContent = () => {
    if (isScientist1Tab1) {
      return (
        <Scientist1Tab1
          selectedScienceTab={selectedScienceTab}
          stopwatchElapsedMs={stopwatchElapsedMs}
          stopwatchRunning={stopwatchRunning}
          formatStopwatch={formatStopwatch}
          startStopwatch={startStopwatch}
          pauseStopwatch={pauseStopwatch}
          resetStopwatch={resetStopwatch}
          cameraRotateDeg={cameraRotateDeg}
          setFullscreenCam={setFullscreenCam}
        />
      );
    }

    if (isEquipmentSpecialistTab) {
      return (
        <EquipmentSpecialist
          selectedScienceTab={selectedScienceTab}
          stopwatchElapsedMs={stopwatchElapsedMs}
          stopwatchRunning={stopwatchRunning}
          formatStopwatch={formatStopwatch}
          startStopwatch={startStopwatch}
          pauseStopwatch={pauseStopwatch}
          resetStopwatch={resetStopwatch}
          cameraRotateDeg={cameraRotateDeg}
          setFullscreenCam={setFullscreenCam}
        />
      );
    }

    if (isScientist1Tab2) {
      return (
        <Scientist1Tab2
          selectedScienceTab={selectedScienceTab}
          cameraRotateDeg={cameraRotateDeg}
          setFullscreenCam={setFullscreenCam}
        />
      );
    }

    if (isScientist2Tab2) {
      return (
        <Scientist2Tab2
          selectedScienceTab={selectedScienceTab}
          stopwatchElapsedMs={stopwatchElapsedMs}
          stopwatchRunning={stopwatchRunning}
          formatStopwatch={formatStopwatch}
          startStopwatch={startStopwatch}
          pauseStopwatch={pauseStopwatch}
          resetStopwatch={resetStopwatch}
          cameraRotateDeg={cameraRotateDeg}
          setFullscreenCam={setFullscreenCam}
        />
      );
    }

    return (
      <DefaultScienceView
        selectedScienceTab={selectedScienceTab}
        cameraRotateDeg={cameraRotateDeg}
        setFullscreenCam={setFullscreenCam}
        panoramaShots={panoramaShots}
        setPanoramaShots={setPanoramaShots}
        sciencePhotos={sciencePhotos}
        setSciencePhotos={setSciencePhotos}
        lastPanoramaLabel={lastPanoramaLabel}
        setLastPanoramaLabel={setLastPanoramaLabel}
        setSciencePopup={setSciencePopup}
      />
    );
  };

  return (
    <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
      <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "stretch", background: "#2b2b2b", borderBottom: "2px solid #1f1e1eff" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SubsystemBar buttons={SCIENCE_SUBSYSTEMS} selected={selectedScienceTab} setSelected={setSelectedScienceTab} compact />
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 8px 0" }}>
            <button
              onClick={() => setShowCameraManager(true)}
              style={{
                borderRadius: "9999px",
                border: "2px solid #0f2f55",
                background: "#1a3f6f",
                color: "white",
                cursor: "pointer",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              Camera Manager
            </button>
          </div>
        </div>
        {renderTabContent()}
      </div>
      <FullscreenOverlay />
      <SciencePopupOverlay />
      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </div>
  );
}
