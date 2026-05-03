"use client";

import React, { useEffect, useRef, useState } from "react";
import RamanPlot from "../../spectrometer/RamanPlot";
import CameraFeed from "./CameraFeed";
import { CAMERA_ROLES, SCIENCE_SUBSYSTEMS } from "./pageConstants";
import SubsystemBar from "./SubsystemBar";

const RAMAN_WS_URL = "ws://localhost:5001/ws/spectrum";
const SCIENCE_CAMERA_ROLES = [CAMERA_ROLES.SCIENCE_1, CAMERA_ROLES.SCIENCE_2, CAMERA_ROLES.SCIENCE_3];

export default function ScienceMonitor() {
  const [selectedScienceTab, setSelectedScienceTab] = useState(SCIENCE_SUBSYSTEMS[0]);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [sciencePopup, setSciencePopup] = useState(null);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [cameraRotateDeg] = useState(0);
  const stopwatchStartRef = useRef(null);
  const isEquipmentSpecialistTab = selectedScienceTab.startsWith("Equipment Specialist");
  const isScientist1Tab1 = selectedScienceTab === "Scientist 1 Tab 1";
  const isScientist1Tab2 = selectedScienceTab === "Scientist 1 Tab 2";
  const isScientist2Tab2 = selectedScienceTab === "Scientist 2 Tab 2";

  const cameraBySlot = (slot) => {
    if (slot >= 7 && slot <= 9) return SCIENCE_CAMERA_ROLES[slot - 7];
    return SCIENCE_CAMERA_ROLES[slot % SCIENCE_CAMERA_ROLES.length];
  };

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

  const CameraImage = ({ cameraId, alt, style, ...imageProps }) => (
    <CameraFeed
      role={cameraId}
      label={alt}
      rotateDeg={cameraRotateDeg}
      style={style}
      {...imageProps}
    />
  );

  const CameraCard = ({ camera }) => (
    <div
      onClick={() => setFullscreenCam(camera)}
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
        style={{
          width: "100%",
          flex: 1,
          objectFit: "cover",
          borderRadius: "6px",
          background: "black",
          minHeight: 0,
          transform: `rotate(${cameraRotateDeg}deg)`,
          transformOrigin: "center center",
        }}
        pausedStyle={{ fontSize: "12px" }}
      />
    </div>
  );

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
    stopwatchStartRef.current = Date.now();
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

  const equipmentSpecialistCameras = [
    { label: "Overhead of Scoops / Sampler", id: cameraBySlot(7) },
    { label: "View of Scoops", id: cameraBySlot(8) },
    { label: "View of Sampler", id: cameraBySlot(9) },
  ];
  const scientist1Cameras = [
    { label: "Nightvision Camera", id: cameraBySlot(7) },
    { label: "Rover Field View", id: cameraBySlot(9) },
  ];
  const isEquipmentSpecialistTab2 = selectedScienceTab === "Equipment Specialist Tab 2";
  const visibleEquipmentSpecialistCameras = isEquipmentSpecialistTab2
    ? [
        equipmentSpecialistCameras[0],
        { ...equipmentSpecialistCameras[2], label: "NightVision Camera" },
      ]
    : equipmentSpecialistCameras;
  const visibleVerticalLayoutCameras = isScientist1Tab1 ? scientist1Cameras : visibleEquipmentSpecialistCameras;
  const tab2NightVisionCamera = { label: "Nightvision Camera", id: cameraBySlot(7) };

  return (
    <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
      <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
        <SubsystemBar buttons={SCIENCE_SUBSYSTEMS} selected={selectedScienceTab} setSelected={setSelectedScienceTab} compact />
        {isEquipmentSpecialistTab || isScientist1Tab1 ? (
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
                    onClick={() => setFullscreenCam(visibleVerticalLayoutCameras[0])}
                    style={{ borderRadius: "8px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
                  >
                    Expand Top
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateRows: `repeat(${visibleVerticalLayoutCameras.length}, minmax(220px, 1fr))`, gap: "10px", minHeight: 0 }}>
                {visibleVerticalLayoutCameras.map((camera) => (
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
        ) : isScientist1Tab2 ? (
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
        ) : isScientist2Tab2 ? (
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
        ) : (
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
              <CameraCard camera={scienceCameras[0]} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
                <CameraCard camera={scienceCameras[1]} />
                <CameraCard camera={scienceCameras[2]} />
              </div>
            </div>
          </div>
        )}
      </div>
      <FullscreenOverlay />
      <SciencePopupOverlay />
    </div>
  );
}
