"use client";

import React, { useEffect, useRef } from "react";
import { useWebRTC } from "../hooks/WebRTCContext";

const OVERLAY_STYLE = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#111",
  color: "#888",
  fontSize: 12,
  fontWeight: 700,
  gap: 6,
  borderRadius: "inherit",
};

export default function CameraFeed({ role, label, style, rotateDeg = 0, onClick, height, passive = false }) {
  const { connected, cameras, streams, enableCamera, disableCamera } = useWebRTC();
  const videoRef = useRef(null);

  const camera = cameras.find((c) => c.role === role);
  const stream = camera ? streams[camera.id] : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!camera || passive) return;
    const id = camera.id;
    enableCamera(id);
    return () => disableCamera(id);
  }, [camera?.id, passive, enableCamera, disableCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const containerStyle = {
    position: "relative",
    background: "#111",
    borderRadius: 10,
    overflow: "hidden",
    cursor: onClick ? "pointer" : undefined,
    ...(height != null ? { height } : {}),
    ...style,
  };

  let overlay = null;
  if (!connected) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Connecting...</span></div>;
  } else if (!camera) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Unassigned — open Camera Manager</span></div>;
  } else if (!stream) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Starting stream...</span></div>;
  }

  return (
    <div style={containerStyle} onClick={onClick}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
            transformOrigin: "center center",
          }}
        />
      )}
      {overlay}
      {stream && label && (
        <div style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          background: "rgba(0,0,0,0.55)",
          padding: "3px 7px",
          borderRadius: 9999,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
