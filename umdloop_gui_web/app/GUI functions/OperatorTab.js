"use client";

import React, { useEffect, useState } from "react";
import RamanPlot from "../../spectrometer/RamanPlot";

const RAMAN_WS_URL = "ws://localhost:5001/ws/spectrum";

export default function OperatorTab({ selectedSubsystem, setSelectedSubsystem }) {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [fps, setFps] = useState(24);
  const [streamPlaying, setStreamPlaying] = useState(true);
  const [forcedFrameCount, setForcedFrameCount] = useState(0);
  const [cameraRotateDeg, setCameraRotateDeg] = useState(0);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [armClampDistance, setArmClampDistance] = useState(35);
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [sciencePopup, setSciencePopup] = useState(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
        setSciencePopup(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
        {camera.label}
      </h4>
      <img
        src={`http://localhost:5000/camera/${camera.id}`}
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
      />
    </div>
  );

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
        <img
          src={`http://localhost:5000/camera/${fullscreenCam.id}`}
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
          <img
            src="http://localhost:5000/camera/12"
            alt="Latest panorama preview"
            style={{ width: "100%", maxHeight: "50vh", objectFit: "cover", borderRadius: "10px", border: "1px solid #444", background: "#111" }}
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

  if (selectedSubsystem === "Drive") {
    const frontCamera = { label: "Front Camera", id: 15 };
    const backCamera = { label: "Back Camera", id: 16 };
    const sideViews = [
      { label: "Left Side", id: 17 },
      { label: "Right Side", id: 18 },
    ];
    const wheelCameras = [
      { label: "Top Left Wheel", cams: [0, 1] },
      { label: "Top Right Wheel", cams: [2, 3] },
      { label: "Bottom Left Wheel", cams: [4, 5] },
      { label: "Bottom Right Wheel", cams: [6, 7] },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", minHeight: 0, height: "100%", background: "#1a1a1a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Control State + Safety</div>
            <button
              onClick={() => setEmergencyStop((prev) => !prev)}
              style={{ width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "7px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
            >
              {emergencyStop ? "EMERGENCY STOP ACTIVE" : "Emergency Stop"}
            </button>
          </div>

          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Vision + Stream Control</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto 1fr", gap: "6px", alignItems: "center" }}>
              <button onClick={() => setFps((p) => Math.max(1, p - 1))} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer" }}>-</button>
              <div style={{ fontSize: "12px", color: "white", textAlign: "center" }}>{fps} FPS</div>
              <button onClick={() => setFps((p) => Math.min(60, p + 1))} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer" }}>+</button>
              <button onClick={() => setForcedFrameCount((n) => n + 1)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontSize: "11px" }}>Force Frame</button>
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <button onClick={() => setStreamPlaying(true)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: streamPlaying ? "#1f7a1f" : "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Play</button>
              <button onClick={() => setStreamPlaying(false)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: !streamPlaying ? "#7a1f1f" : "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Stop</button>
            </div>
            <div style={{ fontSize: "11px", color: "#bbb", marginTop: "5px" }}>Forced frames: {forcedFrameCount}</div>
          </div>
        </div>

        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>Rotate:</span>
          <button onClick={() => setCameraRotateDeg((d) => (d - 90 + 360) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>-90°</button>
          <button onClick={() => setCameraRotateDeg((d) => (d + 90) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>+90°</button>
          <button onClick={() => setCameraRotateDeg(0)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Reset</button>
          <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
          <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
          <button onClick={() => setSelectedSubsystem?.("Drive")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
          <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
          <button onClick={() => setSelectedSubsystem?.("Science")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Science</button>
        </div>

        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0, height: "100%" }}>
          <CameraCard camera={frontCamera} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
            {wheelCameras.map((wheel) => (
              <div key={wheel.label} style={{ background: "#2b2b2b", borderRadius: "10px", border: "1px solid #3d3d3d", padding: "4px", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ color: "white", fontSize: "8px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{wheel.label}</div>
                <div style={{ display: "flex", gap: "3px", flex: 1, minHeight: 0 }}>
                  {wheel.cams.map((camId) => (
                    <img
                      key={camId}
                      src={`http://localhost:5000/camera/${camId}`}
                      alt={`Camera ${camId}`}
                      onClick={() => setFullscreenCam({ label: `${wheel.label} - Cam ${camId}`, id: camId })}
                      style={{ flex: 1, objectFit: "cover", borderRadius: "4px", background: "black", cursor: "pointer", border: "1px solid #3d3d3d" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#c90202";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#3d3d3d";
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", minHeight: 0 }}>
            <CameraCard camera={backCamera} />
            {sideViews.map((side) => <CameraCard key={side.label} camera={side} />)}
          </div>
        </div>
        <FullscreenOverlay />
      </div>
    );
  }

  if (selectedSubsystem === "Arm") {
    const armCameras = [
      { label: "Base Arm", id: 8 },
      { label: "Joint", id: 9 },
      { label: "End Effector", id: 10 },
      { label: "Gripper", id: 11 },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
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
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {armCameras.map((cam) => <CameraCard key={cam.label} camera={cam} />)}
        </div>
        <FullscreenOverlay />
      </div>
    );
  }

  if (selectedSubsystem === "Science") {
    const scienceCameras = [
      { label: "Science Cam 1", id: 12 },
      { label: "Science Cam 2", id: 13 },
      { label: "Science Cam 3", id: 14 },
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
        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
          <CameraCard camera={scienceCameras[0]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
            <CameraCard camera={scienceCameras[1]} />
            <CameraCard camera={scienceCameras[2]} />
          </div>
        </div>
        <FullscreenOverlay />
        <SciencePopupOverlay />
      </div>
    );
  }

  return null;
}
