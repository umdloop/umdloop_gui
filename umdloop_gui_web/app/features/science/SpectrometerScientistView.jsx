"use client";

import React, { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import RamanPlot from "../../../spectrometer/RamanPlot";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES, SPECTROMETER_COMMAND_TOPICS, getRosbridgeUrl } from "../../config";

const RAMAN_WS_URL = "ws://192.168.88.90:5001/ws/spectrum";
const SITES = ["Site 1", "Site 2"];

export default function SpectrometerScientistView() {
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [spectrometerStatus, setSpectrometerStatus] = useState("connecting...");
  const rosRef = useRef(null);

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    rosRef.current = ros;

    ros.on("connection", () => setSpectrometerStatus("connected"));
    ros.on("error", () => setSpectrometerStatus("error"));
    ros.on("close", () => setSpectrometerStatus("disconnected"));

    return () => {
      if (rosRef.current === ros) {
        rosRef.current = null;
      }
      ros.close();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setFullscreenCam(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const nightvisionCamera = { label: "Nightvision Camera", role: CAMERA_ROLES.SCIENCE_1 };

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

  const handleLaserToggle = () => {
    const nextEnabled = !laserEnabled;

    try {
      publishOnce(
        SPECTROMETER_COMMAND_TOPICS.laserCommand,
        buildCommandMessage("spectrometry_laser", "laser_command", nextEnabled ? 1.0 : 0.0)
      );
      setLaserEnabled(nextEnabled);
      setSpectrometerStatus(nextEnabled ? "laser on" : "laser off");
    } catch (error) {
      setSpectrometerStatus(`publish failed: ${error.message}`);
    }
  };

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
          <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", minHeight: "100%" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: "20px", textAlign: "center", letterSpacing: "0.02em" }}>
              Spectrometer Scientist — {selectedSite}
            </div>

            <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "10px" }}>
              <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Spectrometer Control
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) minmax(0, 1fr)", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleLaserToggle}
                  style={{
                    borderRadius: "8px",
                    border: laserEnabled ? "1px solid #1d6b35" : "1px solid #7a1f1f",
                    background: laserEnabled ? "#1f7a1f" : "#8f1d1d",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    padding: "10px 12px",
                  }}
                >
                  {laserEnabled ? "LASER ON" : "LASER OFF"}
                </button>
                <div style={{ display: "grid", gap: "4px", color: "#d8d8d8", fontSize: "16px" }}>
                  <div>Status: <b>{spectrometerStatus}</b></div>
                  <div>Command topic: <b>{SPECTROMETER_COMMAND_TOPICS.laserCommand.name}</b></div>
                </div>
              </div>
            </div>

            <div style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Spectro Data
              </div>
              <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>
                {selectedSite}
              </div>
              <div style={{ minHeight: 0, borderRadius: "8px", overflow: "hidden", border: "1px solid #444", background: "#171717", padding: "8px" }}>
                <RamanPlot wsUrl={RAMAN_WS_URL} width={1200} height={260} fillContainer />
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
            }}
          />
        </div>
      )}

      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </div>
  );
}
