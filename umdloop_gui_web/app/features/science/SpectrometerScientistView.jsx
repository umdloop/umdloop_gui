"use client";

import React, { useEffect, useState } from "react";
import RamanPlot from "../../../spectrometer/RamanPlot";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES } from "../../config";

const RAMAN_WS_URL = "ws://192.168.88.90:5001/ws/spectrum";
const SITES = ["Site 1", "Site 2"];

export default function SpectrometerScientistView() {
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [fullscreenCam, setFullscreenCam] = useState(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setFullscreenCam(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const nightvisionCamera = { label: "Nightvision Camera", role: CAMERA_ROLES.SCIENCE_1 };

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
          <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "12px", display: "grid", gridTemplateRows: "auto minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", minHeight: "100%" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: "20px", textAlign: "center", letterSpacing: "0.02em" }}>
              Spectrometer Scientist — {selectedSite}
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
