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
      </div>
    </>
  );
}
