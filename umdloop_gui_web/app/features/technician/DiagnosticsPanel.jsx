"use client";

import React from "react";
import { TECHNICIAN_TOPICS } from "../../config";

export default function DiagnosticsPanel({
  topicAvailability,
  displayedDiagnosticsSummary,
  displayedDiagnosticItems,
  ledState,
  setLedState,
  laserWarningOn,
  setLaserWarningOn,
  wheelFault,
  systemChecks,
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px" }}>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Status Indicators</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["GREEN", "AMBER", "RED", "BLUE"].map((led) => (
              <button key={led} onClick={() => setLedState(led)} style={{ flex: 1, minWidth: "72px", borderRadius: "8px", border: "1px solid #555", padding: "8px 6px", fontSize: "18px", fontWeight: 700, cursor: "pointer", background: ledState === led ? "#6d1111" : "#2f2f2f", color: "white" }}>
                {led}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "8px", color: "#d8d8d8", fontSize: "19px" }}>Current LED: <span style={{ fontWeight: 800, color: "#fff" }}>{ledState}</span></div>
          <div style={{ marginTop: "8px", color: displayedDiagnosticsSummary.error > 0 ? "#f87171" : displayedDiagnosticsSummary.warn > 0 ? "#f59e0b" : "#9df79d", fontSize: "18px", fontWeight: 700 }}>Diagnostic Focus: {displayedDiagnosticsSummary.topIssue}</div>
          <button onClick={() => setLaserWarningOn((prev) => !prev)} style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #555", padding: "10px 8px", fontSize: "19px", fontWeight: 800, cursor: "pointer", background: laserWarningOn ? "#8f1d1d" : "#2f2f2f", color: "white" }}>
            {laserWarningOn ? "WARNING: LASER ON" : "Laser Warning Off"}
          </button>
          <div style={{ marginTop: "8px", fontSize: "19px", color: wheelFault ? "#ff8080" : "#9df79d", fontWeight: 800 }}>{wheelFault ? "WHEEL FAULT LIGHT: ON" : "WHEEL FAULT LIGHT: OFF"}</div>
        </div>

        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Chassis Subcomponent Checks</div>
          {systemChecks.map((check) => (
            <div key={check.name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #2d2d2d", fontSize: "19px" }}>
              <span style={{ color: "#ddd" }}>{check.name}</span>
              <span style={{ color: check.ok ? "#9df79d" : "#ff8080", fontWeight: 800 }}>{check.ok ? "PASS" : "CHECK"}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px", height: "100%" }}>
        <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Diagnostics Detail</div>
        {!topicAvailability.diagnostics ? (
          <div style={{ color: "#bdbdbd", fontSize: "18px" }}>Waiting for {TECHNICIAN_TOPICS.diagnostics.name}</div>
        ) : displayedDiagnosticItems.length === 0 ? (
          <div style={{ color: "#9df79d", fontSize: "18px", fontWeight: 800 }}>All reported diagnostics are nominal.</div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {displayedDiagnosticItems.map((item) => (
              <div key={`${item.name}-${item.hardwareId}`} style={{ background: "#2a2a2a", border: "1px solid #3f3f3f", borderRadius: "8px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                  <div style={{ color: "white", fontSize: "18px", fontWeight: 800 }}>{item.name}</div>
                  <div style={{ color: item.level >= 2 ? "#ff8080" : item.level === 1 ? "#facc15" : item.level === 3 ? "#f59e0b" : "#9df79d", fontSize: "16px", fontWeight: 800 }}>
                    {item.level >= 2 ? "ERROR" : item.level === 1 ? "WARN" : item.level === 3 ? "STALE" : "OK"}
                  </div>
                </div>
                <div style={{ color: "#d8d8d8", fontSize: "17px", marginTop: "4px" }}>{item.message}</div>
                {item.values.length > 0 ? <div style={{ color: "#bdbdbd", fontSize: "15px", marginTop: "4px" }}>{item.values.join(" | ")}</div> : null}
                <div style={{ color: "#9ca3af", fontSize: "15px", marginTop: "4px" }}>Hardware ID: {item.hardwareId}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
