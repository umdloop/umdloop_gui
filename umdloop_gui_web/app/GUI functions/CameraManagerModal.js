"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/WebRTCContext";
import { CAMERA_ROLES } from "./pageConstants";
import CameraFeed from "./CameraFeed";

const ROLE_OPTIONS = [
  { value: "", label: "Unassigned" },
  { value: CAMERA_ROLES.FRONT, label: "Front Camera" },
  { value: CAMERA_ROLES.BACK, label: "Back Camera" },
  { value: CAMERA_ROLES.LEFT_SIDE, label: "Left Side Camera" },
  { value: CAMERA_ROLES.RIGHT_SIDE, label: "Right Side Camera" },
  { value: CAMERA_ROLES.RADIO_VIEW, label: "Radio View" },
  { value: CAMERA_ROLES.WHEEL_TL, label: "Top Left Wheel" },
  { value: CAMERA_ROLES.WHEEL_TR, label: "Top Right Wheel" },
  { value: CAMERA_ROLES.WHEEL_BL, label: "Bottom Left Wheel" },
  { value: CAMERA_ROLES.WHEEL_BR, label: "Bottom Right Wheel" },
  { value: CAMERA_ROLES.ARM_BASE, label: "Arm Base" },
  { value: CAMERA_ROLES.ARM_JOINT, label: "Arm Joint" },
  { value: CAMERA_ROLES.ARM_EE, label: "Arm End Effector" },
  { value: CAMERA_ROLES.ARM_GRIPPER, label: "Arm Gripper" },
  { value: CAMERA_ROLES.SCIENCE_1, label: "Science Cam 1 / Overhead Scoops / Nightvision" },
  { value: CAMERA_ROLES.SCIENCE_2, label: "Science Cam 2 / View of Scoops" },
  { value: CAMERA_ROLES.SCIENCE_3, label: "Science Cam 3 / View of Sampler / Rover Field View" },
];

const QUALITY_OPTIONS = ["low", "medium", "high", "ultra"];
const DEFAULT_CAMERA_FPS = 10;
const DEFAULT_CAMERA_QUALITY = "low";

function CameraCard({ camera }) {
  const { cameras, stats, streams, enableCamera, disableCamera, renameCamera, setRole, setConfig } = useWebRTC();
  const [nameInput, setNameInput] = useState(camera.name ?? "");
  const [previewing, setPreviewing] = useState(false);
  const [localRes, setLocalRes] = useState(null);
  const [localFps, setLocalFps] = useState(camera.fps ?? DEFAULT_CAMERA_FPS);
  const [localQuality, setLocalQuality] = useState(camera.quality ?? DEFAULT_CAMERA_QUALITY);
  const [localExposure, setLocalExposure] = useState(camera.exposure ?? -1);

  const isEnabled = camera.enabled;
  const cameraStats = stats[camera.id];
  const stream = streams[camera.id];

  const selectedCap = localRes
    ? camera.capabilities?.find((c) => c.width === localRes.width && c.height === localRes.height && c.format === localRes.format)
    : camera.capabilities?.[0];

  const usedRoles = cameras.filter((c) => c.id !== camera.id && c.role).map((c) => c.role);

  const handleToggle = () => {
    if (isEnabled) disableCamera(camera.id);
    else enableCamera(camera.id);
  };

  const handlePreview = () => {
    if (previewing) {
      disableCamera(camera.id);
      setPreviewing(false);
    } else {
      enableCamera(camera.id);
      setPreviewing(true);
    }
  };

  const applyConfig = () => {
    const config = { fps: localFps, quality: localQuality, exposure: localExposure };
    if (selectedCap) {
      config.format = selectedCap.format;
      config.width = selectedCap.width;
      config.height = selectedCap.height;
    }
    setConfig(camera.id, config);
  };

  const inputStyle = {
    width: "100%",
    padding: "4px 8px",
    borderRadius: 6,
    background: "#2e2e2e",
    border: "1px solid #555",
    color: "white",
    fontSize: 11,
  };

  const btnStyle = {
    borderRadius: 6,
    border: "1px solid #555",
    background: "#303030",
    color: "white",
    cursor: "pointer",
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, background: "#1e1e1e", borderRadius: 10, border: "1px solid #3a3a3a", padding: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <CameraFeed
          cameraId={camera.id}
          role={camera.role || null}
          label={camera.name || camera.id}
          passive
          style={{ height: 130, borderRadius: 8 }}
        />
        {!isEnabled && !previewing && (
          <button onClick={handlePreview} style={{ ...btnStyle, background: "#1a3f6f" }}>Preview</button>
        )}
        {!isEnabled && previewing && (
          <button onClick={handlePreview} style={{ ...btnStyle, background: "#4a1a1a" }}>Stop Preview</button>
        )}
        {cameraStats && (
          <div style={{ fontSize: 10, color: "#aaa" }}>
            {cameraStats.fps?.toFixed(1)} fps · {(cameraStats.bitrate / 1000).toFixed(0)} kbps
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#888" }}>ID: {camera.id} · {camera.device ?? "unknown device"}</div>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Camera name"
          />
          <button onClick={() => renameCamera(camera.id, nameInput)} style={btnStyle}>Rename</button>
        </div>

        <select
          value={camera.role ?? ""}
          onChange={(e) => setRole(camera.id, e.target.value)}
          style={inputStyle}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} disabled={usedRoles.includes(o.value)}>
              {o.label}{usedRoles.includes(o.value) ? " (in use)" : ""}
            </option>
          ))}
        </select>

        {camera.capabilities?.length > 0 && (
          <select
            value={localRes ? `${localRes.format}:${localRes.width}x${localRes.height}` : ""}
            onChange={(e) => {
              const [fmt, dims] = e.target.value.split(":");
              const [w, h] = dims.split("x").map(Number);
              setLocalRes({ format: fmt, width: w, height: h });
            }}
            style={inputStyle}
          >
            {camera.capabilities.map((cap) => (
              <option key={`${cap.format}:${cap.width}x${cap.height}`} value={`${cap.format}:${cap.width}x${cap.height}`}>
                {cap.format} {cap.width}×{cap.height}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>FPS (max {selectedCap?.maxFps ?? "—"})</div>
            <input
              type="number"
              min={1}
              max={selectedCap?.maxFps ?? 60}
              value={localFps}
              onChange={(e) => setLocalFps(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>Exposure (-1 = auto)</div>
            <input
              type="number"
              value={localExposure}
              onChange={(e) => setLocalExposure(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>Quality</div>
          <div style={{ display: "flex", gap: 4 }}>
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setLocalQuality(q)}
                style={{ ...btnStyle, flex: 1, background: localQuality === q ? "#1a3f6f" : "#303030" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={applyConfig} style={{ ...btnStyle, flex: 1, background: "#2a4a2a" }}>Apply Config</button>
          <button
            onClick={handleToggle}
            style={{ ...btnStyle, flex: 1, background: isEnabled ? "#4a1a1a" : "#1a4a1a" }}
          >
            {isEnabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CameraManagerModal({ onClose }) {
  const { cameras } = useWebRTC();

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 96vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#222",
          border: "1px solid #4a4a4a",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "white", fontWeight: 900, fontSize: 18 }}>Camera Manager</div>
          <button
            onClick={onClose}
            style={{ borderRadius: 8, border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "6px 12px", fontWeight: 800 }}
          >
            Close
          </button>
        </div>
        {cameras.length === 0 ? (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: 20 }}>
            No cameras discovered. Check WebRTC server connection.
          </div>
        ) : (
          cameras.map((cam) => <CameraCard key={cam.id} camera={cam} />)
        )}
      </div>
    </div>
  );
}
