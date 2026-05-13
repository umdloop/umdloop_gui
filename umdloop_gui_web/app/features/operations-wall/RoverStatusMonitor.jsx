"use client";

import React from "react";
import { TATTU_HV_6S_22000 } from "../../lib/battery";

export default function RoverStatusMonitor({
  driveBattery,
  armBattery,
  systemStats,
  setSystemStats,
  goalLat,
  setGoalLat,
  goalLon,
  setGoalLon,
  goalMode,
  setGoalMode,
  goalStatus,
  submitGoal,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 12, padding: 10 }}>
        <div style={{ fontSize: 12, color: "#d8d8d8", marginBottom: 6 }}>Battery Health ({TATTU_HV_6S_22000.cellCount}S HV LiPo)</div>
        <div style={{ fontSize: 12, color: "#efefef" }}>Drive: {driveBattery.stateOfChargePct.toFixed(1)}% | {driveBattery.packVoltageV.toFixed(2)} V</div>
        <div style={{ fontSize: 12, color: "#efefef" }}>Arm: {armBattery.stateOfChargePct.toFixed(1)}% | {armBattery.packVoltageV.toFixed(2)} V</div>
        <div style={{ fontSize: 11, color: "#bdbdbd", marginTop: 4 }}>Full charge is 26.1 V pack-wide for this battery.</div>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 12, padding: 10 }}>
        <div style={{ fontSize: 12, color: "#d8d8d8", marginBottom: 6 }}>Radio Connectivity Level</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>{systemStats.radio.toFixed(0)}%</div>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 12, padding: 10 }}>
        <div style={{ fontSize: 12, color: "#d8d8d8", marginBottom: 6 }}>LED Status</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["GREEN", "AMBER", "RED", "BLUE"].map((led) => (
            <button
              key={led}
              onClick={() => setSystemStats((prev) => ({ ...prev, ledState: led }))}
              style={{
                flex: 1,
                borderRadius: 8,
                border: "1px solid #555",
                padding: "6px 4px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: systemStats.ledState === led ? "#6d1111" : "#2f2f2f",
                color: "white",
              }}
            >
              {led}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 12, padding: 10 }}>
        <div style={{ fontSize: 12, color: "#d8d8d8", marginBottom: 6 }}>Temperature</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
          {systemStats.sensorTemp.toFixed(1)} C
        </div>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #3d3d3d", borderRadius: 12, padding: 10 }}>
        <div style={{ fontSize: 12, color: "#d8d8d8", marginBottom: 6 }}>GPS Goal</div>
        <input
          value={goalLat}
          onChange={(e) => setGoalLat(e.target.value)}
          placeholder="Latitude"
          style={{ width: "100%", marginBottom: 6, padding: 7, borderRadius: 8, background: "#2e2e2e", border: "1px solid #555", color: "white" }}
        />
        <input
          value={goalLon}
          onChange={(e) => setGoalLon(e.target.value)}
          placeholder="Longitude"
          style={{ width: "100%", marginBottom: 6, padding: 7, borderRadius: 8, background: "#2e2e2e", border: "1px solid #555", color: "white" }}
        />
        <select
          value={goalMode}
          onChange={(e) => setGoalMode(e.target.value)}
          style={{ width: "100%", marginBottom: 6, padding: 7, borderRadius: 8, background: "#2e2e2e", border: "1px solid #555", color: "white" }}
        >
          <option value="GNSS">GNSS</option>
          <option value="Object Detection">Object Detection</option>
          <option value="Aruco Tag">Aruco Tag</option>
        </select>
        <button
          onClick={submitGoal}
          style={{
            width: "100%",
            borderRadius: 9999,
            border: "1px solid #704040",
            background: "#5e1111",
            color: "white",
            fontWeight: 800,
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          Send GPS Goal
        </button>
        {goalStatus && <div style={{ marginTop: 6, fontSize: 12, color: "#ddd" }}>{goalStatus}</div>}
      </div>
    </div>
  );
}
