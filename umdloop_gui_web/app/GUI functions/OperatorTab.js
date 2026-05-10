"use client";

import React, { useEffect, useRef, useState } from "react";
import RamanPlot from "../../spectrometer/RamanPlot";
import CameraFeed from "./CameraFeed";
import CameraManagerModal from "./CameraManagerModal";
import MissionPanel from "./MissionPanel";
import { CAMERA_ROLES } from "./pageConstants";

const RAMAN_WS_URL = "ws://localhost:5001/ws/spectrum";
const CAMERA_ROTATIONS_STORAGE_KEY = "umdloop.cameraRotations";

export default function OperatorTab({ selectedSubsystem, setSelectedSubsystem }) {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [cameraRotationByKey, setCameraRotationByKey] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(CAMERA_ROTATIONS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [armClampDistance, setArmClampDistance] = useState(35);
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [sciencePopup, setSciencePopup] = useState(null);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [locationReached, setLocationReached] = useState(false);
  const stopwatchStartRef = useRef(null);
  const driveRosCommandPlaceholders = ["ROS2 Command 1", "ROS2 Command 2", "ROS2 Command 3", "ROS2 Command 4"];
  const confettiPieces = Array.from({ length: 42 }, (_, index) => ({
    id: index,
    color: ["#ff4d4d", "#ffd166", "#06d6a0", "#4cc9f0", "#f72585", "#ffffff"][index % 6],
    delay: `${(index % 7) * 0.08}s`,
    duration: `${1.55 + (index % 5) * 0.16}s`,
    rotation: `${(index * 37) % 360}deg`,
    burstX: `${((index % 10) - 4.5) * 10}px`,
    burstY: `${-185 - (index % 7) * 24}px`,
    fallX: `${((index % 12) - 5.5) * 24}px`,
    fallY: `${300 + (index % 8) * 36}px`,
  }));

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
        setSciencePopup(null);
        setLocationReached(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CAMERA_ROTATIONS_STORAGE_KEY, JSON.stringify(cameraRotationByKey));
  }, [cameraRotationByKey]);

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

  const getCameraKey = (camera) => camera?.role ?? camera?.label;
  const getCameraRotation = (camera) => {
    const cameraKey = getCameraKey(camera);
    return cameraKey ? cameraRotationByKey[cameraKey] ?? 0 : 0;
  };

  const updateFullscreenRotation = (getNextRotation) => {
    const cameraKey = getCameraKey(fullscreenCam);
    if (!cameraKey) return;

    setCameraRotationByKey((prev) => {
      const currentRotation = prev[cameraKey] ?? 0;
      const nextRotation = typeof getNextRotation === "function"
        ? getNextRotation(currentRotation)
        : getNextRotation;
      const normalizedRotation = ((nextRotation % 360) + 360) % 360;

      return {
        ...prev,
        [cameraKey]: normalizedRotation,
      };
    });
  };

  const FullscreenOverlay = () =>
    fullscreenCam && (
      <div
        onClick={() => setFullscreenCam(null)}
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.95)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}
        >
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", margin: 0 }}>{fullscreenCam.label}</h2>
          <button
            type="button"
            onClick={() => updateFullscreenRotation((d) => d - 90)}
            style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
          >
            -90°
          </button>
          <button
            type="button"
            onClick={() => updateFullscreenRotation((d) => d + 90)}
            style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
          >
            +90°
          </button>
          <button
            type="button"
            onClick={() => updateFullscreenRotation(0)}
            style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
          >
            Reset
          </button>
        </div>
        <div style={{ width: "min(1000px, 95vw)", height: "80vh" }}>
          <CameraFeed
            role={fullscreenCam.role}
            label={fullscreenCam.label}
            passive
            rotateDeg={getCameraRotation(fullscreenCam)}
            style={{ height: "100%", borderRadius: 12 }}
          />
        </div>
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

  const ControlRow = () => (
    <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
      <MissionPanel />
      <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
      <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
      <button onClick={() => setSelectedSubsystem?.("Drive (Default)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Default)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
      <button onClick={() => setSelectedSubsystem?.("Drive (Science)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Science)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive Science</button>
      <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Arm" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
      <button onClick={() => setShowCameraManager(true)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#1a3f6f", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}>Camera Manager</button>
      {(selectedSubsystem === "Drive (Default)" || selectedSubsystem === "Drive") ? (
        <button
          onClick={() => setLocationReached(true)}
          style={{
            marginLeft: "auto",
            borderRadius: "8px",
            border: locationReached ? "1px solid #2f7d3a" : "1px solid #803737",
            background: locationReached ? "#1f8f35" : "#8a1f1f",
            color: "white",
            cursor: "pointer",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 900,
          }}
        >
          Location Reached
        </button>
      ) : null}
    </div>
  );

  if (selectedSubsystem === "Drive (Science)") {
    const scienceDrivePanels = [
      { title: "Wide-Angle Panorama Image", tone: "#2d4f62" },
      { title: "Stratigraphic Profile Image", tone: "#6a5234" },
      { title: "Close-Up High Res. Image", tone: "#5c3f2d" },
      { title: "GNSS Coords. / Elevation", tone: "#2d3b4f" },
    ];

    return (
      <div style={{ padding: "12px", minHeight: 0, height: "100%", background: "#1a1a1a", overflow: "auto" }}>
        <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "16px", display: "grid", gridTemplateRows: "auto auto repeat(4, minmax(0, 1fr))", gap: "12px", minHeight: "100%" }}>
          <div style={{ color: "white", fontWeight: 900, fontSize: "18px", textAlign: "center", letterSpacing: "0.03em" }}>
            Rover Operator (Driver)
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
          {scienceDrivePanels.map((panel) => (
            <div key={panel.title} style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {panel.title}
              </div>
              <div
                style={{
                  borderRadius: "8px",
                  border: "1px solid #4a4a4a",
                  background: `linear-gradient(180deg, ${panel.tone} 0%, #1b1b1b 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.82)",
                  fontWeight: 800,
                  fontSize: panel.title === "GNSS Coords. / Elevation" ? "18px" : "20px",
                  textAlign: "center",
                  padding: "12px",
                  minHeight: 0,
                }}
              >
                {panel.title === "GNSS Coords. / Elevation" ? "GNSS Coords. / Elevation" : panel.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedSubsystem === "Drive (Default)" || selectedSubsystem === "Drive") {
    const wheelGroups = [
      { label: "Top Left Wheel", role: CAMERA_ROLES.WHEEL_TL },
      { label: "Top Right Wheel", role: CAMERA_ROLES.WHEEL_TR },
      { label: "Bottom Left Wheel", role: CAMERA_ROLES.WHEEL_BL },
      { label: "Bottom Right Wheel", role: CAMERA_ROLES.WHEEL_BR },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", minHeight: 0, height: "100%", background: "#1a1a1a" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Control State + Safety</div>
          <button
            onClick={() => setEmergencyStop((prev) => !prev)}
            style={{ width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "7px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
          >
            {emergencyStop ? "EMERGENCY STOP ACTIVE" : "Emergency Stop"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", marginTop: "8px" }}>
            {driveRosCommandPlaceholders.map((commandLabel) => (
              <button
                key={commandLabel}
                type="button"
                style={{
                  minHeight: "42px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#303030",
                  color: "#d8d8d8",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: "10px",
                  padding: "6px",
                }}
              >
                {commandLabel}
              </button>
            ))}
          </div>
        </div>

        <ControlRow />

        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0, height: "100%" }}>
          <CameraFeed
            role={CAMERA_ROLES.FRONT}
            label="Front Camera"
            rotateDeg={getCameraRotation({ label: "Front Camera", role: CAMERA_ROLES.FRONT })}
            onClick={() => setFullscreenCam({ label: "Front Camera", role: CAMERA_ROLES.FRONT })}
            style={{ height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
            {wheelGroups.map((wheel) => (
              <div key={wheel.label} style={{ background: "#2b2b2b", borderRadius: "10px", border: "1px solid #3d3d3d", padding: "4px", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ color: "white", fontSize: "8px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{wheel.label}</div>
                <CameraFeed
                  role={wheel.role}
                  label={wheel.label}
                  rotateDeg={getCameraRotation(wheel)}
                  onClick={() => setFullscreenCam({ label: wheel.label, role: wheel.role })}
                  style={{ flex: 1, borderRadius: 4, border: "1px solid #3d3d3d", cursor: "pointer" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", minHeight: 0 }}>
            {[
              { label: "Back Camera", role: CAMERA_ROLES.BACK },
              { label: "Left Side", role: CAMERA_ROLES.LEFT_SIDE },
              { label: "Right Side", role: CAMERA_ROLES.RIGHT_SIDE },
              { label: "Radio View", role: CAMERA_ROLES.RADIO_VIEW },
            ].map((cam) => (
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
        <FullscreenOverlay />
        {locationReached ? (
          <div
            tabIndex={-1}
            onClick={() => setLocationReached(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "rgba(0,0,0,0.86)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            <style>
              {`
                @keyframes locationReachedConfetti {
                  0% {
                    opacity: 0;
                    transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(0.65);
                  }
                  10% {
                    opacity: 1;
                  }
                  36% {
                    opacity: 1;
                    transform: translate3d(calc(-50% + var(--confetti-burst-x)), calc(-50% + var(--confetti-burst-y)), 0) rotate(260deg) scale(1);
                  }
                  100% {
                    opacity: 0;
                    transform: translate3d(calc(-50% + var(--confetti-fall-x)), calc(-50% + var(--confetti-fall-y)), 0) rotate(780deg) scale(0.95);
                  }
                }
              `}
            </style>
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: piece.id % 3 === 0 ? "7px" : "10px",
                  height: piece.id % 3 === 0 ? "16px" : "8px",
                  borderRadius: piece.id % 4 === 0 ? "9999px" : "2px",
                  background: piece.color,
                  transform: `rotate(${piece.rotation})`,
                  opacity: 0,
                  animation: `locationReachedConfetti ${piece.duration} cubic-bezier(0.18, 0.82, 0.28, 1) ${piece.delay} 2`,
                  "--confetti-burst-x": piece.burstX,
                  "--confetti-burst-y": piece.burstY,
                  "--confetti-fall-x": piece.fallX,
                  "--confetti-fall-y": piece.fallY,
                }}
              />
            ))}
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(900px, 92vw)",
                minHeight: "min(360px, 70vh)",
                borderRadius: "14px",
                border: "3px solid #2f7d3a",
                background: "#102215",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontSize: "clamp(44px, 8vw, 96px)",
                fontWeight: 1000,
                letterSpacing: "0.04em",
              }}
            >
              LOCATION REACHED
            </div>
          </div>
        ) : null}
        {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
      </div>
    );
  }

  if (selectedSubsystem === "Arm") {
    const armCameras = [
      { label: "Base Arm", role: CAMERA_ROLES.ARM_BASE },
      { label: "Joint", role: CAMERA_ROLES.ARM_JOINT },
      { label: "End Effector", role: CAMERA_ROLES.ARM_EE },
      { label: "Gripper", role: CAMERA_ROLES.ARM_GRIPPER },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Arm Safety</div>
            <div style={{ fontSize: "12px", color: "#e8e8e8" }}>Emergency Stop: <b>{emergencyStop ? "ON" : "OFF"}</b></div>
            <button
              onClick={() => setEmergencyStop((prev) => !prev)}
              style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "8px 10px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
            >
              {emergencyStop ? "E-STOP ON" : "Emergency Stop"}
            </button>
          </div>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "4px", fontWeight: 800 }}>Clamp Distance to Fully Close</div>
              <input type="range" min={0} max={100} value={armClampDistance} onChange={(e) => setArmClampDistance(Number(e.target.value))} style={{ width: "100%" }} />
              <div style={{ color: "white", fontSize: "12px" }}>{armClampDistance}%</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["Cylindrical Control", "Joint By Joint"].map((controlMode) => (
                <button
                  key={controlMode}
                  type="button"
                  style={{
                    minHeight: "46px",
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: "#303030",
                    color: "#d8d8d8",
                    cursor: "pointer",
                    fontWeight: 900,
                    padding: "8px",
                  }}
                >
                  {controlMode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ControlRow />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {armCameras.map((cam) => (
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
        <FullscreenOverlay />
        {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
      </div>
    );
  }

  if (selectedSubsystem === "Science") {
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

        <ControlRow />

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
        <FullscreenOverlay />
        <SciencePopupOverlay />
        {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
      </div>
    );
  }

  return null;
}
