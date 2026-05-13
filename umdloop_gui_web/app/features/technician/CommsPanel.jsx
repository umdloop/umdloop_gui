"use client";

import React from "react";
import { TECHNICIAN_TOPICS } from "../../config";

export default function CommsPanel({
  rosStatus,
  ledState,
  setLedState,
  radioLevel,
  bytesPerSecond,
  freshTelemetryCount,
  telemetryTopicStates,
  stalestTelemetry,
  displayedVelocityMps,
  displayedHeadingDeg,
  headingLabel,
  motionState,
  motionStats,
  estimatedTurnRadiusM,
  displayedDiagnosticsSummary,
  diagnosticsTelemetryFresh,
  topicAvailability,
  laserWarningOn,
  setLaserWarningOn,
  wheelFault,
  systemChecks,
  showCanPopup,
  setShowCanPopup,
  canConnections,
}) {
  return (
    <>
      <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "16px", minHeight: "220px" }}>
        <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Comms / Link Health</div>
        <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>ROS Link: <b>{rosStatus}</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>LED Status: <b>{ledState}</b></div>
        <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Radio Connectivity: <b>{radioLevel.toFixed(0)}%</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Radio Status: <b>fallback until /radio/status exists</b></div>
        <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Info Rate: <b>{bytesPerSecond.toFixed(0)} B/s</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Telemetry Topics Fresh: <b>{freshTelemetryCount}/{telemetryTopicStates.length}</b>{stalestTelemetry ? ` | Oldest ${stalestTelemetry.label.toUpperCase()} ${Math.max(0, stalestTelemetry.ageMs / 1000).toFixed(1)} s` : ""}</div>
        <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Rover Velocity (telemetry): <b>{displayedVelocityMps.toFixed(2)} m/s</b></div>
        <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Heading: <b>{displayedHeadingDeg != null ? `${displayedHeadingDeg.toFixed(1)} deg` : `Waiting for ${TECHNICIAN_TOPICS.heading.name}`}</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Heading Sector: <b>{headingLabel}</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Motion State: <b>{motionState}</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Distance Traveled: <b>{motionStats.distanceM.toFixed(1)} m</b> | Max Speed: <b>{motionStats.maxSpeedMps.toFixed(2)} m/s</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Yaw Rate: <b>{motionStats.yawRateDps.toFixed(1)} deg/s</b>{estimatedTurnRadiusM != null ? ` | Turn Radius ${estimatedTurnRadiusM.toFixed(2)} m` : ""}</div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "8px" }}>Diagnostics: <b>{topicAvailability.diagnostics && diagnosticsTelemetryFresh ? `${displayedDiagnosticsSummary.ok} ok / ${displayedDiagnosticsSummary.warn} warn / ${displayedDiagnosticsSummary.error} error / ${displayedDiagnosticsSummary.stale} stale` : `Waiting for ${TECHNICIAN_TOPICS.diagnostics.name}`}</b></div>
        <button onClick={() => setShowCanPopup(true)} style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #4f4f4f", background: "#2b2b2b", color: "white", padding: "10px 12px", fontSize: "18px", fontWeight: 800, cursor: "pointer" }}>
          View CAN Connections
        </button>
      </div>

      {showCanPopup ? (
        <div onClick={() => setShowCanPopup(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(860px, 96vw)", maxHeight: "84vh", overflowY: "auto", background: "#212121", border: "1px solid #4a4a4a", borderRadius: "12px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ color: "white", fontSize: "28px", fontWeight: 900 }}>CAN Connection Status</div>
              <button onClick={() => setShowCanPopup(false)} style={{ borderRadius: "8px", border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "8px 12px", fontWeight: 800, fontSize: "16px" }}>
                Close
              </button>
            </div>
            <div style={{ color: "#cfcfcf", fontSize: "18px", marginBottom: "12px" }}>Snapshot of CAN channels. ROS and MikroTik link metrics are live; some auxiliary channels remain placeholder.</div>
            <div style={{ display: "grid", gap: "8px" }}>
              {canConnections.map((bus) => (
                <div key={bus.name} style={{ display: "grid", gridTemplateColumns: "1.8fr auto", gap: "10px", alignItems: "center", background: "#2b2b2b", border: "1px solid #3f3f3f", borderRadius: "10px", padding: "12px" }}>
                  <div>
                    <div style={{ color: "white", fontSize: "20px", fontWeight: 800 }}>{bus.name}</div>
                    <div style={{ color: "#bdbdbd", fontSize: "16px", marginTop: "4px" }}>{bus.detail}</div>
                  </div>
                  <div style={{ display: "grid", gap: "6px", minWidth: "120px" }}>
                    <div style={{ borderRadius: "999px", padding: "8px 12px", fontWeight: 900, fontSize: "16px", color: "white", textAlign: "center", background: bus.percent >= 75 ? "#166534" : bus.percent >= 40 ? "#b45309" : "#991b1b" }}>
                      {bus.percent}%
                    </div>
                    <div style={{ height: "8px", borderRadius: "999px", background: "#3a3a3a", overflow: "hidden" }}>
                      <div style={{ width: `${bus.percent}%`, height: "100%", background: bus.percent >= 75 ? "#22c55e" : bus.percent >= 40 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
