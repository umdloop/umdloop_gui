"use client";

import React from "react";
import CameraFeed from "./CameraFeed";

export default function FullscreenCameraOverlay({ camera, rotation, onRotate }) {
  if (!camera) return null;

  return (
    <div
      onClick={() => onRotate(null)}
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
        <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", margin: 0 }}>{camera.label}</h2>
        <button
          type="button"
          onClick={() => onRotate((d) => d - 90)}
          style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
        >
          -90°
        </button>
        <button
          type="button"
          onClick={() => onRotate((d) => d + 90)}
          style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
        >
          +90°
        </button>
        <button
          type="button"
          onClick={() => onRotate(0)}
          style={{ borderRadius: 8, border: "1px solid #666", background: "#303030", color: "white", cursor: "pointer", padding: "7px 11px", fontWeight: 800 }}
        >
          Reset
        </button>
      </div>
      <div style={{ width: "min(1000px, 95vw)", height: "80vh" }}>
        <CameraFeed
          role={camera.role}
          label={camera.label}
          passive
          rotateDeg={rotation}
          style={{ height: "100%", borderRadius: 12 }}
        />
      </div>
    </div>
  );
}
