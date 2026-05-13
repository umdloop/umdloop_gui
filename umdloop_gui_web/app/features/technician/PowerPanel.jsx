"use client";

import React from "react";
import { TATTU_HV_6S_22000 } from "../../lib/battery";

export default function PowerPanel({ driveBattery }) {
  return (
    <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "16px", minHeight: "220px" }}>
      <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Power / Environment</div>
      <div style={{ fontSize: "16px", color: "#bdbdbd", marginBottom: "10px" }}>{TATTU_HV_6S_22000.name} | Sim fallback for battery until battery topics are published</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        <div style={{ background: "#262626", border: "1px solid #383838", borderRadius: "10px", padding: "10px" }}>
          <div style={{ fontSize: "18px", color: "white", fontWeight: 800, marginBottom: "4px" }}>Battery</div>
          <div style={{ fontSize: "18px", color: "#d8d8d8" }}>SoC: <b>{driveBattery.stateOfChargePct.toFixed(1)}%</b></div>
          <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Pack: <b>{driveBattery.packVoltageV.toFixed(2)} V</b></div>
          <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Cell: <b>{driveBattery.perCellVoltageV.toFixed(2)} V</b></div>
          <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Energy: <b>{driveBattery.remainingWh.toFixed(0)} Wh</b></div>
          <div style={{ fontSize: "18px", color: driveBattery.status === "Critical" ? "#f87171" : driveBattery.status === "Reserve" ? "#f59e0b" : driveBattery.status === "Warm" ? "#facc15" : "#86efac" }}>Status: <b>{driveBattery.status}</b></div>
          <div style={{ fontSize: "17px", color: "#bdbdbd" }}>
            Load: <b>{driveBattery.loadCurrentA != null ? `${driveBattery.loadCurrentA.toFixed(1)} A` : "--"}</b>
            {driveBattery.estRuntimeMinutes != null ? ` | Est. runtime ${driveBattery.estRuntimeMinutes.toFixed(0)} min` : ""}
          </div>
          <div style={{ fontSize: "15px", color: "#9ca3af" }}>Source: fallback model</div>
        </div>
      </div>

    </div>
  );
}
