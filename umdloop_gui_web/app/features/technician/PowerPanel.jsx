"use client";

import React from "react";
import { TATTU_HV_6S_22000 } from "../../lib/battery";

export default function PowerPanel({ driveBattery, armBattery, sensorTemps }) {
  return (
    <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "16px", minHeight: "220px" }}>
      <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Power / Environment</div>
      <div style={{ fontSize: "16px", color: "#bdbdbd", marginBottom: "10px" }}>{TATTU_HV_6S_22000.name} | Sim fallback for battery until battery topics are published</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        {[{ label: "Drive Pack", snapshot: driveBattery }, { label: "Arm Pack", snapshot: armBattery }].map(({ label, snapshot }) => (
          <div key={label} style={{ background: "#262626", border: "1px solid #383838", borderRadius: "10px", padding: "10px" }}>
            <div style={{ fontSize: "18px", color: "white", fontWeight: 800, marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "18px", color: "#d8d8d8" }}>SoC: <b>{snapshot.stateOfChargePct.toFixed(1)}%</b></div>
            <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Pack: <b>{snapshot.packVoltageV.toFixed(2)} V</b></div>
            <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Cell: <b>{snapshot.perCellVoltageV.toFixed(2)} V</b></div>
            <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Energy: <b>{snapshot.remainingWh.toFixed(0)} Wh</b></div>
            <div style={{ fontSize: "18px", color: snapshot.status === "Critical" ? "#f87171" : snapshot.status === "Reserve" ? "#f59e0b" : snapshot.status === "Warm" ? "#facc15" : "#86efac" }}>Status: <b>{snapshot.status}</b></div>
            <div style={{ fontSize: "17px", color: "#bdbdbd" }}>
              Load: <b>{snapshot.loadCurrentA != null ? `${snapshot.loadCurrentA.toFixed(1)} A` : "--"}</b>
              {snapshot.estRuntimeMinutes != null ? ` | Est. runtime ${snapshot.estRuntimeMinutes.toFixed(0)} min` : ""}
            </div>
            <div style={{ fontSize: "15px", color: "#9ca3af" }}>Source: fallback model</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Temps:</div>
      <div style={{ fontSize: "15px", color: "#9ca3af", marginBottom: "6px" }}>Temperature source: fallback model</div>
      {Object.entries(sensorTemps).map(([k, v]) => <div key={k} style={{ fontSize: "19px", color: "#efefef", marginBottom: "4px" }}>{k}: {v.toFixed(1)} C</div>)}
    </div>
  );
}
