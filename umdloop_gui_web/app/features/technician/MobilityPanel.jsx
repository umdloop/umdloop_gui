"use client";

import React from "react";

export default function MobilityPanel({
  avgWheelVelocity,
  steerSpreadDeg,
  wheelImbalanceDeg,
  frontSteerMismatchDeg,
  rearSteerMismatchDeg,
  mobilityTrackingState,
  displayedWheelDiag,
  displayedSteerDiag,
  motorEnabled,
  setMotorEnabled,
  sendHardMotorStop,
  motorCommandStatus,
  displayedTilt,
  displayedImuDynamics,
  tiltWarning,
  safetyPercent,
}) {
  return (
    <>
      <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px", height: "100%" }}>
        <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Mobility Diagnostics (Wheel + Steering)</div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "10px" }}>Average wheel velocity: <b>{avgWheelVelocity.toFixed(2)} rad/s</b> | Steering spread: <b>{steerSpreadDeg.toFixed(1)} deg</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "10px" }}>Wheel imbalance: <b>{wheelImbalanceDeg.toFixed(2)} rad/s</b> | Front steer mismatch: <b>{frontSteerMismatchDeg.toFixed(1)} deg</b> | Rear steer mismatch: <b>{rearSteerMismatchDeg.toFixed(1)} deg</b></div>
        <div style={{ fontSize: "18px", color: "#bdbdbd", marginBottom: "10px" }}>Tracking State: <b>{mobilityTrackingState}</b></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
          {["fl", "fr", "rl", "rr"].map((key) => (
            <div key={key} style={{ background: "#2a2a2a", border: "1px solid #3f3f3f", borderRadius: "8px", padding: "8px" }}>
              <div style={{ fontWeight: 800, color: "white", fontSize: "18px", marginBottom: "6px" }}>{key.toUpperCase()}</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Wheel vel: {displayedWheelDiag[key].velocity.toFixed(2)} rad/s</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Wheel curr: {displayedWheelDiag[key].current.toFixed(2)} A</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Steer orient: {displayedSteerDiag[key].orientationDeg.toFixed(1)} deg</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Steer curr: {displayedSteerDiag[key].current.toFixed(2)} A</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px" }}>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Motor Enable / Disable</div>
          <div style={{ fontSize: "16px", color: "#bdbdbd", marginBottom: "10px" }}>Hard safety publishes a short stop burst across the rover drive topics. Individual toggles remain GUI-local until a per-motor rover interface exists.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "6px" }}>
            {Object.keys(motorEnabled).map((motor) => (
              <button key={motor} onClick={() => setMotorEnabled((prev) => ({ ...prev, [motor]: !prev[motor] }))} style={{ borderRadius: "8px", border: "1px solid #555", padding: "8px 6px", cursor: "pointer", background: motorEnabled[motor] ? "#1f7a1f" : "#7a1f1f", color: "white", fontSize: "17px", fontWeight: 800 }}>
                {motor} {motorEnabled[motor] ? "EN" : "DIS"}
              </button>
            ))}
          </div>
          <button onClick={sendHardMotorStop} style={{ marginTop: "10px", width: "100%", borderRadius: "8px", border: "1px solid #7a1f1f", background: "#8f1d1d", color: "white", padding: "10px", fontWeight: 900, cursor: "pointer", fontSize: "19px" }}>
            Disable Motors (HARD SAFETY)
          </button>
          <div style={{ marginTop: "8px", color: motorCommandStatus.startsWith("Stop failed") ? "#ff8080" : "#d8d8d8", fontSize: "17px" }}>{motorCommandStatus}</div>
        </div>

        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Safety + Stability</div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Front-to-back tilt: <b>{displayedTilt.pitchDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Left-to-right tilt: <b>{displayedTilt.rollDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>X-Y plane tilt magnitude: <b>{displayedTilt.magnitudeDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Tilt vector: <b>{displayedTilt.vectorLabel}</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>IMU yaw rate: <b>{displayedImuDynamics.yawRateDegs.toFixed(1)} deg/s</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Accel magnitude: <b>{displayedImuDynamics.accelMagnitude.toFixed(2)} m/s^2</b> | State: <b>{displayedImuDynamics.accelState}</b></div>
          <div style={{ marginTop: "6px", fontSize: "19px", color: tiltWarning ? "#ff8080" : "#9df79d", fontWeight: 800 }}>{tiltWarning ? "TILT WARNING ACTIVE" : "Tilt within safe range"}</div>
          <div style={{ marginTop: "6px", fontSize: "18px", color: "#d8d8d8" }}>Stability State: <b>{displayedTilt.magnitudeDeg > 10 ? "CRITICAL" : displayedTilt.magnitudeDeg > 6 ? "CAUTION" : "NOMINAL"}</b></div>
          <div style={{ marginTop: "6px", fontSize: "19px", color: "#d8d8d8" }}>Area of Safety</div>
          <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "#2a2a2a", border: "1px solid #444", overflow: "hidden" }}>
            <div style={{ width: `${safetyPercent}%`, height: "100%", background: tiltWarning ? "#b91c1c" : "#15803d" }} />
          </div>
        </div>
      </div>
    </>
  );
}
