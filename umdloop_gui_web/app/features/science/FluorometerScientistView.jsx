"use client";

import React, { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES, FLUOROMETER_COMMAND_TOPICS, FLUOROMETER_TOPICS, getRosbridgeUrl } from "../../config";

const SITES = ["Site 1", "Site 2"];

export default function FluorometerScientistView() {
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [ledEnabled, setLedEnabled] = useState(false);
  const [measurementRate, setMeasurementRate] = useState("1.0");
  const [wavelengthIntensity, setWavelengthIntensity] = useState(null);
  const [fluoroStatus, setFluoroStatus] = useState("connecting...");
  const stopwatchStartRef = useRef(null);
  const rosRef = useRef(null);
  const cameraRotateDeg = 0;

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    rosRef.current = ros;

    ros.on("connection", () => setFluoroStatus("connected"));
    ros.on("error", () => setFluoroStatus("error"));
    ros.on("close", () => setFluoroStatus("disconnected"));

    const photodiodeResponseTopic = new ROSLIB.Topic({
      ros,
      name: FLUOROMETER_TOPICS.photodiodeResponse.name,
      messageType: FLUOROMETER_TOPICS.photodiodeResponse.messageType,
    });

    photodiodeResponseTopic.subscribe((msg) => {
      const values = msg?.interface_values?.[0];
      const names = values?.interface_names || [];
      const readingValues = values?.values || [];
      const intensityIndex = names.findIndex((name) => name === "wavelength_intensity");
      if (intensityIndex >= 0) {
        const nextValue = Number(readingValues[intensityIndex]);
        setWavelengthIntensity(Number.isFinite(nextValue) ? nextValue : null);
      }
    });

    return () => {
      photodiodeResponseTopic.unsubscribe();
      if (rosRef.current === ros) {
        rosRef.current = null;
      }
      ros.close();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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

  const publishOnce = (topicConfig, payload) => {
    if (!rosRef.current) {
      throw new Error("ROS is not connected");
    }

    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicConfig.name,
      messageType: topicConfig.messageType,
    });

    topic.publish(new ROSLIB.Message(payload));
  };

  const buildCommandMessage = (groupName, interfaceName, value) => ({
    header: {
      stamp: { sec: 0, nanosec: 0 },
      frame_id: "",
    },
    interface_groups: [groupName],
    interface_values: [
      {
        interface_names: [interfaceName],
        values: [value],
      },
    ],
  });

  const handleLedToggle = () => {
    const nextEnabled = !ledEnabled;

    try {
      publishOnce(
        FLUOROMETER_COMMAND_TOPICS.ledCommand,
        buildCommandMessage("fluoro_led", "toggle", nextEnabled ? 1.0 : 0.0)
      );

      if (nextEnabled) {
        const nextRate = Number(measurementRate);
        publishOnce(
          FLUOROMETER_COMMAND_TOPICS.photodiodeRequestCommand,
          buildCommandMessage("photodiode", "request_measurement_rate", Number.isFinite(nextRate) ? nextRate : 1.0)
        );
      }

      setLedEnabled(nextEnabled);
      setFluoroStatus(nextEnabled ? "led on" : "led off");
    } catch (error) {
      setFluoroStatus(`publish failed: ${error.message}`);
    }
  };

  const nightvisionCamera = { label: "Nightvision Camera", role: CAMERA_ROLES.NIGHT_VISION };

  return (
    <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
      <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "stretch", background: "#2b2b2b", borderBottom: "2px solid #1f1e1e" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", gap: "8px", padding: "8px 12px" }}>
            {SITES.map((site) => {
              const isActive = site === selectedSite;
              return (
                <button
                  key={site}
                  onClick={() => setSelectedSite(site)}
                  style={{
                    borderRadius: "9999px",
                    border: isActive ? "2px solid #1d4f80" : "2px solid #4a4a4a",
                    background: isActive ? "#1a3f6f" : "#2f2f2f",
                    color: "white",
                    cursor: "pointer",
                    padding: "7px 18px",
                    fontSize: "13px",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {site}
                </button>
              );
            })}
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

        <div style={{ padding: "12px", height: "100%", minHeight: 0, background: "#1a1a1a", overflow: "auto" }}>
          <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto auto auto minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", minHeight: "100%" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: "20px", textAlign: "center", letterSpacing: "0.02em" }}>
              Fluorometer Scientist — {selectedSite}
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

            <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "10px" }}>
              <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Fluorometer Control
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) minmax(160px, 220px)", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleLedToggle}
                  style={{
                    borderRadius: "8px",
                    border: ledEnabled ? "1px solid #1d6b35" : "1px solid #7a1f1f",
                    background: ledEnabled ? "#1f7a1f" : "#8f1d1d",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    padding: "10px 12px",
                  }}
                >
                  {ledEnabled ? "LED ON" : "LED OFF"}
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={measurementRate}
                  onChange={(event) => setMeasurementRate(event.target.value)}
                  disabled={ledEnabled}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: ledEnabled ? "#1f1f1f" : "#2f2f2f",
                    color: ledEnabled ? "#888" : "white",
                    padding: "10px 12px",
                    fontWeight: 700,
                    width: "100%",
                  }}
                />
              </div>
              <div style={{ color: "#d8d8d8", fontSize: "15px" }}>
                Measurement rate publishes once when the LED turns on. Turn the LED off to edit the rate.
              </div>
              <div style={{ display: "grid", gap: "4px", color: "#d8d8d8", fontSize: "16px" }}>
                <div>Status: <b>{fluoroStatus}</b></div>
                <div>Photodiode topic: <b>{FLUOROMETER_TOPICS.photodiodeResponse.name}</b></div>
                <div>Wavelength intensity: <b>{wavelengthIntensity == null ? "Waiting for reading" : wavelengthIntensity.toFixed(3)}</b></div>
              </div>
            </div>

            <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fluoro Data
              </div>
              <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>
                {selectedSite}
              </div>
              <div style={{ borderRadius: "8px", border: "1px solid #444", background: "#171717", display: "grid", placeItems: "center", color: "#b7b7b7", fontWeight: 700, minHeight: 0 }}>
                Fluorescence analysis placeholder
              </div>
            </div>

            <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Camera Feed
              </div>
              <div style={{ color: "white", fontSize: "20px", fontWeight: 800, lineHeight: 1.15 }}>
                {nightvisionCamera.label}
              </div>
              <CameraFeed
                role={nightvisionCamera.role}
                label={nightvisionCamera.label}
                onClick={() => setFullscreenCam(nightvisionCamera)}
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
              />
            </div>
          </div>
        </div>
      </div>

      {fullscreenCam && (
        <div
          onClick={() => setFullscreenCam(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
          <CameraFeed
            role={fullscreenCam.role}
            label={fullscreenCam.label}
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              width: "min(1280px, 96vw)",
              height: "80vh",
              borderRadius: "12px",
              background: "black",
              transform: `rotate(${cameraRotateDeg}deg)`,
              transformOrigin: "center center",
            }}
          />
        </div>
      )}

      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </div>
  );
}
