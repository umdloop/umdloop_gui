"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import MissionPanel from "../../components/mission/MissionPanel";
import { CAMERA_ROLES } from "../../config";

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

export default function DriveView({
  selectedSubsystem,
  setSelectedSubsystem,
  setFullscreenCam,
  getCameraRotation,
  emergencyStop,
  setEmergencyStop,
  setShowCameraManager,
  locationReached,
  setLocationReached,
}) {
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

      {/* ControlRow */}
      <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <MissionPanel />
        <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
        <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
        <button onClick={() => setSelectedSubsystem?.("Drive (Default)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Default)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
        <button onClick={() => setSelectedSubsystem?.("Drive (Science)")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive (Science)" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive Science</button>
        <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Arm" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
        <button onClick={() => setShowCameraManager(true)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#1a3f6f", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}>Camera Manager</button>
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
      </div>

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
    </div>
  );
}
