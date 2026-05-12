"use client";

import { useRadioStatus } from "../lib/useRadioStatus";

/**
 * Radio-Loss Banner — fixed to the bottom edge of the viewport, full width.
 * Pulses red at 1 Hz. Shows elapsed seconds since last successful Rover Backend response.
 * Only renders when offline for more than 3 seconds.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export default function RadioLossBanner() {
  const { isOffline, secondsSinceLastResponse } = useRadioStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        @keyframes redGlow {
          0%,
          100% {
            box-shadow: 0 0 8px 2px rgba(255, 0, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 20px 6px rgba(255, 0, 0, 0.9);
          }
        }
      `}</style>
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "5vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(180, 0, 0, 0.92)",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1rem",
          zIndex: 9999,
          animation: "redGlow 1s ease-in-out infinite",
        }}
      >
        ⚠ RADIO LINK LOST — {secondsSinceLastResponse}s since last response
      </div>
    </>
  );
}
