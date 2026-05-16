"use client";

import React from "react";
import { useWebRTC } from "../../context/WebRTCContext";

export default function ConnectionStatusBanner() {
  const { connected } = useWebRTC();

  if (connected) return null;

  return (
    <>
      <style>
        {`
          @keyframes connectionLostPulse {
            0%, 100% {
              background: #8a1f1f;
              box-shadow: 0 -6px 22px rgba(220, 38, 38, 0.45);
            }
            50% {
              background: #d11f1f;
              box-shadow: 0 -10px 32px rgba(220, 38, 38, 0.85);
            }
          }
          @keyframes connectionLostDot {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.25); }
          }
        `}
      </style>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "10px 16px",
          color: "white",
          fontWeight: 900,
          fontSize: "13px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          borderTop: "2px solid #ff5252",
          animation: "connectionLostPulse 1.4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "9999px",
            background: "white",
            animation: "connectionLostDot 1.4s ease-in-out infinite",
          }}
        />
        Connection to Jetson server lost — attempting to reconnect…
      </div>
    </>
  );
}
