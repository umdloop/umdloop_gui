"use client";

import React, { useState,useEffect } from 'react';


import ROSLIB from "roslib";
import MapView from "./MapView";
import OperationsWall from "./OperationsWall";
import { getRosbridgeUrl } from "./config";
import RamanPlot from "../spectrometer/RamanPlot";

export const modes = ["Operator", "Technician", "Drone", "Navigation"];
export const icons = ["camera.png", "sensor.png", "camera.png", "navigation.png"];
export const subsystems = ["Drive", "Arm", "Science"];

function NavigationBar( {selectedMode, setSelectedMode} ) {
    const [hoveredButtonId, setHoveredButtonId] = useState(null);
    const [selectedButton, setSelectedButton] = useState(0);
    let buttonColor;
    return (
        <nav style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "6px",
          padding: "12px 8px",
          background: "#3d3d3d"}}>
            {icons.map((mode, idx) => {
              if (hoveredButtonId === idx) {
                buttonColor = "#353535ff";
              } else if (selectedButton === idx) {
                buttonColor = "#262626ff";
              } else {
                buttonColor = "#3d3d3d";
              }
              return(
                <button
                  key={`${mode}-${idx}`}
                  style={{
                    background: buttonColor,
                    border: "2px solid #1f1e1eff",
                    borderRadius: "10px",
                    padding: "12px 8px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    flex: 1,
                    minWidth: "0",
                  }}
                  onMouseEnter={() => setHoveredButtonId(idx)}
                  onMouseLeave={() => setHoveredButtonId(null)}
                  onClick={() => {
                    setSelectedMode(modes[idx])
                    setSelectedButton(idx)
                  }}
                >
                  <img src={`/${mode}`} alt={mode.replace('.png', '')} style={{ width: "36px", height: "36px" }} />
                  <span style={{ color: "white", fontSize: "10px", whiteSpace: "nowrap" }}>{modes[idx]}</span>
                </button>
              );
            })}
        </nav>
    );
}

function Subsystem({ buttons, selected, setSelected }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [selectedButton, setSelectedButton] = useState(0);
  let buttonColor;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      justifyContent: "center",
      minHeight: "100vh",
      gap: "20px",
      marginTop: "-100px",
      marginLeft: "-50px",
    }}>
      {buttons.map((label, idx) => {
        if (hoveredButtonId === idx) {
          buttonColor = "#960303ff";
        } else if (selectedButton === idx) {
          buttonColor = "#530000ff";
        } else {
          buttonColor = "#c90202ff";
        }

        return (
          <div
            key={label}
            style={{
              background: buttonColor,
              border: "2px solid #360101ff",
              width: "400px",
              height: "80px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => {
              setSelected(label);
              setSelectedButton(idx);
            }}
          >
            <span style={{ fontFamily: "Arial Black", color: "white", fontSize: "20px" }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal subsystem bar for vertical monitor layout
function SubsystemBar({ buttons, selected, setSelected }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      padding: "12px 20px",
      background: "#2b2b2b",
      borderBottom: "2px solid #1f1e1eff",
    }}>
      {buttons.map((label, idx) => {
        let buttonColor;
        if (hoveredButtonId === idx) {
          buttonColor = "#960303ff";
        } else if (selected === label) {
          buttonColor = "#530000ff";
        } else {
          buttonColor = "#c90202ff";
        }

        return (
          <div
            key={label}
            style={{
              background: buttonColor,
              border: "2px solid #360101ff",
              padding: "10px 32px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => setSelected(label)}
          >
            <span style={{ fontFamily: "Arial Black", color: "white", fontSize: "14px" }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TechnicianDashboard() {
  const [setHours, setSetHours] = useState("00");
  const [setMinutes, setSetMinutes] = useState("10");
  const [setSeconds, setSetSeconds] = useState("00");
  const [configuredSeconds, setConfiguredSeconds] = useState(600);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);
  const [ledState, setLedState] = useState("GREEN");
  const [laserWarningOn, setLaserWarningOn] = useState(false);
  const [showCanPopup, setShowCanPopup] = useState(false);
  const [rosStatus, setRosStatus] = useState("connecting...");
  const [bytesPerSecond, setBytesPerSecond] = useState(0);
  const [roverVelocityMps, setRoverVelocityMps] = useState(0);
  const [tilt, setTilt] = useState({ rollDeg: 0, pitchDeg: 0, magnitudeDeg: 0, vectorLabel: "CENTERED" });
  const [sensorTemps, setSensorTemps] = useState({
    driveController: 41.2,
    armController: 39.8,
    batteryPack: 35.1,
    avionics: 37.4,
  });
  const [powerStats, setPowerStats] = useState({ batteryDrive: 94, batteryArm: 88 });
  const [radioLevel, setRadioLevel] = useState(82);
  const [wheelDiag, setWheelDiag] = useState({
    fl: { velocity: 0, current: 0 },
    fr: { velocity: 0, current: 0 },
    rl: { velocity: 0, current: 0 },
    rr: { velocity: 0, current: 0 },
  });
  const [steerDiag, setSteerDiag] = useState({
    fl: { orientationDeg: 0, current: 0 },
    fr: { orientationDeg: 0, current: 0 },
    rl: { orientationDeg: 0, current: 0 },
    rr: { orientationDeg: 0, current: 0 },
  });
  const [motorEnabled, setMotorEnabled] = useState({
    wheelFL: true,
    wheelFR: true,
    wheelRL: true,
    wheelRR: true,
    steerFL: true,
    steerFR: true,
    steerRL: true,
    steerRR: true,
  });

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setShowCanPopup(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    let byteCounter = 0;

    ros.on("connection", () => setRosStatus("connected"));
    ros.on("error", () => setRosStatus("error"));
    ros.on("close", () => setRosStatus("disconnected"));

    const countBytes = (msg) => {
      try {
        byteCounter += JSON.stringify(msg).length;
      } catch (_) {
        byteCounter += 0;
      }
    };

    const odomTopic = new ROSLIB.Topic({ ros, name: "/odom", messageType: "nav_msgs/msg/Odometry" });
    odomTopic.subscribe((msg) => {
      countBytes(msg);
      const linear = msg?.twist?.twist?.linear;
      if (!linear) return;
      const mag = Math.sqrt((linear.x || 0) ** 2 + (linear.y || 0) ** 2 + (linear.z || 0) ** 2);
      setRoverVelocityMps(mag);
    });

    const imuTopic = new ROSLIB.Topic({ ros, name: "/imu/data", messageType: "sensor_msgs/msg/Imu" });
    imuTopic.subscribe((msg) => {
      countBytes(msg);
      const q = msg?.orientation;
      if (!q) return;
      const qw = q.w || 1;
      const qx = q.x || 0;
      const qy = q.y || 0;
      const qz = q.z || 0;
      const sinrCosp = 2 * (qw * qx + qy * qz);
      const cosrCosp = 1 - 2 * (qx * qx + qy * qy);
      const roll = Math.atan2(sinrCosp, cosrCosp);
      const sinp = 2 * (qw * qy - qz * qx);
      const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);
      const rollDeg = roll * (180 / Math.PI);
      const pitchDeg = pitch * (180 / Math.PI);
      const magnitudeDeg = Math.sqrt(rollDeg ** 2 + pitchDeg ** 2);
      const lr = rollDeg >= 0 ? "RIGHT" : "LEFT";
      const fb = pitchDeg >= 0 ? "FRONT" : "BACK";
      setTilt({
        rollDeg,
        pitchDeg,
        magnitudeDeg,
        vectorLabel: magnitudeDeg < 0.4 ? "CENTERED" : `${fb}-${lr}`,
      });
    });

    const jointStateTopic = new ROSLIB.Topic({ ros, name: "/joint_states", messageType: "sensor_msgs/msg/JointState" });
    jointStateTopic.subscribe((msg) => {
      countBytes(msg);
      const names = msg?.name || [];
      const positions = msg?.position || [];
      const velocities = msg?.velocity || [];
      const efforts = msg?.effort || [];

      const idxByPatterns = (patterns) =>
        names.findIndex((n) => patterns.some((p) => n.toLowerCase().includes(p)));

      const wheelPatterns = {
        fl: ["front_left_wheel", "wheel_fl", "fl_wheel", "left_front_wheel"],
        fr: ["front_right_wheel", "wheel_fr", "fr_wheel", "right_front_wheel"],
        rl: ["rear_left_wheel", "wheel_rl", "rl_wheel", "left_rear_wheel"],
        rr: ["rear_right_wheel", "wheel_rr", "rr_wheel", "right_rear_wheel"],
      };
      const steerPatterns = {
        fl: ["front_left_steer", "steer_fl", "fl_steer", "left_front_steer"],
        fr: ["front_right_steer", "steer_fr", "fr_steer", "right_front_steer"],
        rl: ["rear_left_steer", "steer_rl", "rl_steer", "left_rear_steer"],
        rr: ["rear_right_steer", "steer_rr", "rr_steer", "right_rear_steer"],
      };

      const nextWheel = {
        fl: { velocity: 0, current: 0 },
        fr: { velocity: 0, current: 0 },
        rl: { velocity: 0, current: 0 },
        rr: { velocity: 0, current: 0 },
      };
      Object.keys(wheelPatterns).forEach((k) => {
        const idx = idxByPatterns(wheelPatterns[k]);
        if (idx >= 0) {
          nextWheel[k] = {
            velocity: Number(velocities[idx] || 0),
            current: Number(efforts[idx] || 0),
          };
        }
      });
      setWheelDiag(nextWheel);

      const nextSteer = {
        fl: { orientationDeg: 0, current: 0 },
        fr: { orientationDeg: 0, current: 0 },
        rl: { orientationDeg: 0, current: 0 },
        rr: { orientationDeg: 0, current: 0 },
      };
      Object.keys(steerPatterns).forEach((k) => {
        const idx = idxByPatterns(steerPatterns[k]);
        if (idx >= 0) {
          nextSteer[k] = {
            orientationDeg: Number((positions[idx] || 0) * (180 / Math.PI)),
            current: Number(efforts[idx] || 0),
          };
        }
      });
      setSteerDiag(nextSteer);
    });

    const bytesInterval = setInterval(() => {
      setBytesPerSecond(byteCounter);
      byteCounter = 0;
    }, 1000);

    return () => {
      clearInterval(bytesInterval);
      odomTopic.unsubscribe();
      imuTopic.unsubscribe();
      jointStateTopic.unsubscribe();
      ros.close();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPowerStats((prev) => ({
        batteryDrive: Math.max(8, prev.batteryDrive - 0.03),
        batteryArm: Math.max(8, prev.batteryArm - 0.02),
      }));
      setRadioLevel((prev) => Math.max(15, Math.min(100, prev + (Math.random() * 4 - 2))));
      setSensorTemps((prev) => ({
        driveController: Math.max(20, Math.min(95, prev.driveController + (Math.random() * 0.8 - 0.4))),
        armController: Math.max(20, Math.min(95, prev.armController + (Math.random() * 0.8 - 0.4))),
        batteryPack: Math.max(20, Math.min(95, prev.batteryPack + (Math.random() * 0.6 - 0.3))),
        avionics: Math.max(20, Math.min(95, prev.avionics + (Math.random() * 0.7 - 0.35))),
      }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const applyTimer = () => {
    const h = Math.max(0, parseInt(setHours, 10) || 0);
    const m = Math.max(0, parseInt(setMinutes, 10) || 0);
    const s = Math.max(0, parseInt(setSeconds, 10) || 0);
    const total = h * 3600 + m * 60 + s;
    setConfiguredSeconds(total);
    setRemainingSeconds(total);
    setTimerRunning(false);
  };

  const tiltWarning = tilt.magnitudeDeg > 12;
  const safetyPercent = Math.max(0, Math.min(100, (tilt.magnitudeDeg / 15) * 100));
  const wheelFault = Object.values(wheelDiag).some((wheel) => Math.abs(wheel.current) > 18);
  const canConnections = [
    { name: "CAN0 Main Bus", percent: rosStatus === "connected" ? 97 : rosStatus === "connecting..." ? 52 : 8, detail: rosStatus === "connected" ? "Heartbeat active" : "ROS bridge not fully established" },
    { name: "CAN1 Arm Bus", percent: Math.max(5, Math.min(100, Math.round(radioLevel))), detail: `Radio-derived quality ${radioLevel.toFixed(0)}%` },
    { name: "CAN2 Mobility Bus", percent: Math.max(10, Math.min(100, Math.round((bytesPerSecond / 1400) * 100))), detail: `Telemetry rate ${bytesPerSecond.toFixed(0)} B/s` },
    { name: "CAN3 Instrument Bus", percent: 61, detail: "Science instrument link initialized" },
    { name: "CAN4 Aux Bus", percent: 89, detail: "Aux power and lighting nominal" },
  ];

  const systemChecks = [
    { name: "ROS Link", ok: rosStatus === "connected" },
    { name: "Power Bus", ok: powerStats.batteryDrive > 15 && powerStats.batteryArm > 15 },
    { name: "Thermal", ok: Object.values(sensorTemps).every((t) => t < 75) },
    { name: "Mobility Motors", ok: Object.values(motorEnabled).some(Boolean) },
    { name: "Safety Envelope", ok: !tiltWarning },
  ];

  return (
    <div
      style={{
        height: "100%",
        minHeight: "100%",
        padding: "10px",
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto minmax(240px, 1fr) minmax(280px, 1.2fr) minmax(250px, 1fr) minmax(250px, 1fr)",
        gap: "10px",
        alignItems: "stretch",
      }}
    >
      <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
        <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "8px", fontWeight: 800 }}>Mission Clock</div>
        <div style={{ fontSize: "28px", fontWeight: 900, color: "white", letterSpacing: "1px" }}>{hours}:{minutes}:{seconds}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "6px", marginTop: "10px" }}>
          <input value={setHours} onChange={(e) => setSetHours(e.target.value)} placeholder="HH" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
          <input value={setMinutes} onChange={(e) => setSetMinutes(e.target.value)} placeholder="MM" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
          <input value={setSeconds} onChange={(e) => setSetSeconds(e.target.value)} placeholder="SS" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
          <button onClick={applyTimer} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #5a5a5a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Set</button>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <button onClick={() => setTimerRunning(true)} disabled={remainingSeconds <= 0} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2f6b2f", background: remainingSeconds > 0 ? "#1f7a1f" : "#3a3a3a", color: "white", fontWeight: 700, cursor: remainingSeconds > 0 ? "pointer" : "not-allowed", fontSize: "18px" }}>Start</button>
          <button onClick={() => setTimerRunning(false)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Pause</button>
          <button onClick={() => { setTimerRunning(false); setRemainingSeconds(configuredSeconds); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Reset</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "stretch", height: "100%" }}>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "16px", minHeight: "220px" }}>
          <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Power / Environment</div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Battery Drive: <b>{powerStats.batteryDrive.toFixed(1)}%</b></div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Battery Arm: <b>{powerStats.batteryArm.toFixed(1)}%</b></div>
          <div style={{ marginTop: 10, fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Temps:</div>
          {Object.entries(sensorTemps).map(([k, v]) => (
            <div key={k} style={{ fontSize: "19px", color: "#efefef", marginBottom: "4px" }}>{k}: {v.toFixed(1)} C</div>
          ))}
        </div>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "16px", minHeight: "220px" }}>
          <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Comms / Link Health</div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>ROS Link: <b>{rosStatus}</b></div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Radio Connectivity: <b>{radioLevel.toFixed(0)}%</b></div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Info Rate: <b>{bytesPerSecond.toFixed(0)} B/s</b></div>
          <div style={{ fontSize: "20px", color: "#d8d8d8", marginBottom: "8px" }}>Rover Velocity (telemetry): <b>{roverVelocityMps.toFixed(2)} m/s</b></div>
          <button
            onClick={() => setShowCanPopup(true)}
            style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #4f4f4f", background: "#2b2b2b", color: "white", padding: "10px 12px", fontSize: "18px", fontWeight: 800, cursor: "pointer" }}
          >
            View CAN Connections
          </button>
        </div>
      </div>

      <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px", height: "100%" }}>
        <div style={{ fontSize: "26px", color: "#ffffff", marginBottom: "12px", fontWeight: 900, letterSpacing: "0.5px" }}>Mobility Diagnostics (Wheel + Steering)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {["fl", "fr", "rl", "rr"].map((key) => (
            <div key={key} style={{ background: "#2a2a2a", border: "1px solid #3f3f3f", borderRadius: "8px", padding: "8px" }}>
              <div style={{ fontWeight: 800, color: "white", fontSize: "18px", marginBottom: "6px" }}>{key.toUpperCase()}</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Wheel vel: {wheelDiag[key].velocity.toFixed(2)} rad/s</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Wheel curr: {wheelDiag[key].current.toFixed(2)} A</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Steer orient: {steerDiag[key].orientationDeg.toFixed(1)} deg</div>
              <div style={{ fontSize: "18px", color: "#d8d8d8" }}>Steer curr: {steerDiag[key].current.toFixed(2)} A</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", height: "100%" }}>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Motor Enable / Disable</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {Object.keys(motorEnabled).map((motor) => (
              <button
                key={motor}
                onClick={() => setMotorEnabled((prev) => ({ ...prev, [motor]: !prev[motor] }))}
                style={{
                  borderRadius: "8px",
                  border: "1px solid #555",
                  padding: "8px 6px",
                  cursor: "pointer",
                  background: motorEnabled[motor] ? "#1f7a1f" : "#7a1f1f",
                  color: "white",
                  fontSize: "17px",
                  fontWeight: 800,
                }}
              >
                {motor} {motorEnabled[motor] ? "EN" : "DIS"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMotorEnabled({
              wheelFL: false, wheelFR: false, wheelRL: false, wheelRR: false,
              steerFL: false, steerFR: false, steerRL: false, steerRR: false,
            })}
            style={{ marginTop: "10px", width: "100%", borderRadius: "8px", border: "1px solid #7a1f1f", background: "#8f1d1d", color: "white", padding: "10px", fontWeight: 900, cursor: "pointer", fontSize: "19px" }}
          >
            Disable Motors (HARD SAFETY)
          </button>
        </div>

        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Safety + Stability</div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Front-to-back tilt: <b>{tilt.pitchDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Left-to-right tilt: <b>{tilt.rollDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>X-Y plane tilt magnitude: <b>{tilt.magnitudeDeg.toFixed(2)} deg</b></div>
          <div style={{ fontSize: "19px", color: "#d8d8d8" }}>Tilt vector: <b>{tilt.vectorLabel}</b></div>
          <div style={{ marginTop: "6px", fontSize: "19px", color: tiltWarning ? "#ff8080" : "#9df79d", fontWeight: 800 }}>
            {tiltWarning ? "TILT WARNING ACTIVE" : "Tilt within safe range"}
          </div>
          <div style={{ marginTop: "6px", fontSize: "19px", color: "#d8d8d8" }}>Area of Safety</div>
          <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "#2a2a2a", border: "1px solid #444", overflow: "hidden" }}>
            <div style={{ width: `${safetyPercent}%`, height: "100%", background: tiltWarning ? "#b91c1c" : "#15803d" }} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", height: "100%" }}>
        <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
          <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "10px", fontWeight: 800 }}>Status Indicators</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["GREEN", "AMBER", "RED", "BLUE"].map((led) => (
              <button
                key={led}
                onClick={() => setLedState(led)}
                style={{
                  flex: 1,
                  minWidth: "72px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  padding: "8px 6px",
                  fontSize: "18px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: ledState === led ? "#6d1111" : "#2f2f2f",
                  color: "white",
                }}
              >
                {led}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "8px", color: "#d8d8d8", fontSize: "19px" }}>Current LED: <span style={{ fontWeight: 800, color: "#fff" }}>{ledState}</span></div>
          <button
            onClick={() => setLaserWarningOn((prev) => !prev)}
            style={{
              marginTop: "8px",
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #555",
              padding: "10px 8px",
              fontSize: "19px",
              fontWeight: 800,
              cursor: "pointer",
              background: laserWarningOn ? "#8f1d1d" : "#2f2f2f",
              color: "white",
            }}
          >
            {laserWarningOn ? "WARNING: LASER ON" : "Laser Warning Off"}
          </button>
          <div style={{ marginTop: "8px", fontSize: "19px", color: wheelFault ? "#ff8080" : "#9df79d", fontWeight: 800 }}>
            {wheelFault ? "WHEEL FAULT LIGHT: ON" : "WHEEL FAULT LIGHT: OFF"}
          </div>
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

      {showCanPopup && (
        <div
          onClick={() => setShowCanPopup(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(860px, 96vw)", maxHeight: "84vh", overflowY: "auto", background: "#212121", border: "1px solid #4a4a4a", borderRadius: "12px", padding: "14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ color: "white", fontSize: "28px", fontWeight: 900 }}>CAN Connection Status</div>
              <button
                onClick={() => setShowCanPopup(false)}
                style={{ borderRadius: "8px", border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "8px 12px", fontWeight: 800, fontSize: "16px" }}
              >
                Close
              </button>
            </div>
            <div style={{ color: "#cfcfcf", fontSize: "18px", marginBottom: "12px" }}>
              Snapshot of all CAN channels. Data/logic is placeholder and can be wired later.
            </div>
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
      )}
    </div>
  );
}


function PageContent({ selectedMode, selectedSubsystem, setSelectedSubsystem, selectedNavItem, setSelectedNavItem, sharedRos, setSharedRos }) {
  if (selectedMode === "Operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <Cameras selectedSubsystem={selectedSubsystem} setSelectedSubsystem={setSelectedSubsystem} />
      </div>
    );
  }
  else if (selectedMode === "Technician") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <TechnicianDashboard />
      </div>
    );
  }
  else if (selectedMode === "Drone") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "12px", height: "100%", padding: "10px" }}>
        <div style={{ minHeight: 0, border: "1px solid #333", borderRadius: "10px", overflow: "hidden" }}>
          <OperationsWall pane="drone" />
        </div>
        <div style={{ minHeight: 0, border: "1px solid #333", borderRadius: "10px", overflow: "hidden" }}>
          <MapView selectedSubsystem={selectedSubsystem} titleOverride="Drone: Map-View" />
        </div>
      </div>
    );
  }
  else if (selectedMode === "Navigation") {
    return (
      <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
        <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
          <SubsystemBar
            buttons={NAVIGATION_BUTTONS}
            selected={selectedNavItem}
            setSelected={setSelectedNavItem}
          />
          <div style={{ padding: "8px", overflow: "auto" }}>
          <Navigation selectedNavItem={selectedNavItem} />
          </div>
        </div>
      </div>
    );
  }
}
function Simulation( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h2>{selectedSubsystem} - Simulation Mode</h2>
    </div>
  );
}

function Cameras({ selectedSubsystem, setSelectedSubsystem }) {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [fps, setFps] = useState(24);
  const [streamPlaying, setStreamPlaying] = useState(true);
  const [forcedFrameCount, setForcedFrameCount] = useState(0);
  const [cameraRotateDeg, setCameraRotateDeg] = useState(0);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [armClampDistance, setArmClampDistance] = useState(35);
  const [panoramaShots, setPanoramaShots] = useState(0);
  const [sciencePhotos, setSciencePhotos] = useState(0);
  const [lastPanoramaLabel, setLastPanoramaLabel] = useState("No panorama captured yet.");
  const [sciencePopup, setSciencePopup] = useState(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
        setSciencePopup(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const CameraCard = ({ camera }) => (
    <div
      onClick={() => setFullscreenCam(camera)}
      style={{
        background: "#2b2b2b",
        borderRadius: "10px",
        border: "1px solid #3d3d3d",
        padding: "5px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#c90202"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#3d3d3d"}
    >
      <h4 style={{ color: "white", fontSize: "10px", fontWeight: "bold", textAlign: "center", marginBottom: "3px" }}>
        {camera.label}
      </h4>
      <img
        src={`http://localhost:5000/camera/${camera.id}`}
        alt={camera.label}
        style={{
          width: "100%",
          flex: 1,
          objectFit: "cover",
          borderRadius: "6px",
          background: "black",
          minHeight: 0,
          transform: `rotate(${cameraRotateDeg}deg)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );

  const FullscreenOverlay = () => fullscreenCam && (
    <div
      onClick={() => setFullscreenCam(null)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
      <img
        src={`http://localhost:5000/camera/${fullscreenCam.id}`}
        alt={fullscreenCam.label}
        style={{
          maxWidth: "100%",
          maxHeight: "80vh",
          objectFit: "contain",
          borderRadius: "12px",
          background: "black",
          transform: `rotate(${cameraRotateDeg}deg)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );

  const SciencePopupOverlay = () => {
    if (!sciencePopup) return null;

    let title = "";
    let body = null;

    if (sciencePopup === "panorama") {
      title = "Panorama Preview";
      body = (
        <div style={{ display: "grid", gap: "10px" }}>
          <img
            src="http://localhost:5000/camera/12"
            alt="Latest panorama preview"
            style={{ width: "100%", maxHeight: "50vh", objectFit: "cover", borderRadius: "10px", border: "1px solid #444", background: "#111" }}
          />
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>{lastPanoramaLabel}</div>
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Placeholder preview panel. Stitching/export will be wired later.</div>
        </div>
      );
    } else if (sciencePopup === "tasks") {
      title = "Additional Science Tasks";
      const taskItems = [
        "Soil Core Collection",
        "Rock Face Classification",
        "Sample Bag Labeling",
        "Drill Site Annotation",
        "Spectrometer Calibration",
      ];
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          {taskItems.map((task) => (
            <button
              key={task}
              style={{ textAlign: "left", borderRadius: "8px", border: "1px solid #555", background: "#2d2d2d", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 700 }}
            >
              {task}
            </button>
          ))}
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Task actions are UI placeholders for now.</div>
        </div>
      );
    } else if (sciencePopup === "soil") {
      title = "Soil Moisture Analysis";
      const points = [28, 34, 41, 39, 44, 48, 52];
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>Probe trend over last 7 reads</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", alignItems: "end", height: "150px", background: "#171717", border: "1px solid #444", borderRadius: "8px", padding: "10px" }}>
            {points.map((p, i) => (
              <div key={`soil-${i}`} style={{ height: `${p * 2}px`, background: "#16a34a", borderRadius: "4px 4px 0 0" }} title={`T${i + 1}: ${p}%`} />
            ))}
          </div>
          <div style={{ color: "#a9a9a9", fontSize: "12px" }}>Graph is a placeholder UI panel.</div>
        </div>
      );
    } else if (sciencePopup === "spectral") {
      title = "Raman Spectrum Analysis";
      body = (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ color: "#d8d8d8", fontSize: "13px" }}>Live Raman spectrum from spectrometer</div>
          <RamanPlot wsUrl="ws://localhost:5000/ws/spectrum" width={700} height={400} />
        </div>
      );
    }

    return (
      <div
        onClick={() => setSciencePopup(null)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(760px, 96vw)", maxHeight: "85vh", overflowY: "auto", background: "#222", border: "1px solid #4a4a4a", borderRadius: "12px", padding: "14px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: "20px" }}>{title}</div>
            <button onClick={() => setSciencePopup(null)} style={{ borderRadius: "8px", border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "6px 10px", fontWeight: 800 }}>Close</button>
          </div>
          {body}
        </div>
      </div>
    );
  };

  if (selectedSubsystem === "Drive") {
    const frontCamera = { label: "Front Camera", id: 15 };
    const backCamera = { label: "Back Camera", id: 16 };
    const sideViews = [
      { label: "Left Side", id: 17 },
      { label: "Right Side", id: 18 },
    ];
    const wheelCameras = [
      { label: "Top Left Wheel", cams: [0, 1] },
      { label: "Top Right Wheel", cams: [2, 3] },
      { label: "Bottom Left Wheel", cams: [4, 5] },
      { label: "Bottom Right Wheel", cams: [6, 7] },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", minHeight: 0, height: "100%", background: "#1a1a1a" }}>
        {/* Top controls: 2 panels side by side, auto height */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Control State + Safety</div>
            <button
              onClick={() => setEmergencyStop((prev) => !prev)}
              style={{ width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "7px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
            >
              {emergencyStop ? "EMERGENCY STOP ACTIVE" : "Emergency Stop"}
            </button>
          </div>

          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Vision + Stream Control</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto auto 1fr", gap: "6px", alignItems: "center" }}>
              <button onClick={() => setFps((p) => Math.max(1, p - 1))} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer" }}>-</button>
              <div style={{ fontSize: "12px", color: "white", textAlign: "center" }}>{fps} FPS</div>
              <button onClick={() => setFps((p) => Math.min(60, p + 1))} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer" }}>+</button>
              <button onClick={() => setForcedFrameCount((n) => n + 1)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontSize: "11px" }}>Force Frame</button>
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <button onClick={() => setStreamPlaying(true)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: streamPlaying ? "#1f7a1f" : "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Play</button>
              <button onClick={() => setStreamPlaying(false)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: !streamPlaying ? "#7a1f1f" : "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Stop</button>
            </div>
            <div style={{ fontSize: "11px", color: "#bbb", marginTop: "5px" }}>Forced frames: {forcedFrameCount}</div>
          </div>
        </div>

        {/* Action strip: rotate + view switcher (replaces fixed sidebar) */}
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>Rotate:</span>
          <button onClick={() => setCameraRotateDeg((d) => (d - 90 + 360) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>-90°</button>
          <button onClick={() => setCameraRotateDeg((d) => (d + 90) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>+90°</button>
          <button onClick={() => setCameraRotateDeg(0)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Reset</button>
          <div style={{ width: "1px", height: "18px", background: "#4a4a4a" }} />
          <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>View:</span>
          <button onClick={() => setSelectedSubsystem?.("Drive")} style={{ borderRadius: "6px", border: "1px solid #555", background: selectedSubsystem === "Drive" ? "#7c1919" : "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Drive</button>
          <button onClick={() => setSelectedSubsystem?.("Arm")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Arm</button>
          <button onClick={() => setSelectedSubsystem?.("Science")} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Science</button>
        </div>

        {/* Camera grid: portrait layout — front (top), wheels 2×2 (middle), back+sides (bottom) */}
        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0, height: "100%" }}>
          <CameraCard camera={frontCamera} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
            {wheelCameras.map((wheel) => (
              <div key={wheel.label} style={{ background: "#2b2b2b", borderRadius: "10px", border: "1px solid #3d3d3d", padding: "4px", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ color: "white", fontSize: "8px", fontWeight: 700, textAlign: "center", marginBottom: "2px" }}>{wheel.label}</div>
                <div style={{ display: "flex", gap: "3px", flex: 1, minHeight: 0 }}>
                  {wheel.cams.map((camId) => (
                    <img
                      key={camId}
                      src={`http://localhost:5000/camera/${camId}`}
                      alt={`Camera ${camId}`}
                      onClick={() => setFullscreenCam({ label: `${wheel.label} - Cam ${camId}`, id: camId })}
                      style={{ flex: 1, objectFit: "cover", borderRadius: "4px", background: "black", cursor: "pointer", border: "1px solid #3d3d3d" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#c90202"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#3d3d3d"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", minHeight: 0 }}>
            <CameraCard camera={backCamera} />
            {sideViews.map((side) => <CameraCard key={side.label} camera={side} />)}
          </div>
        </div>
        <FullscreenOverlay />
      </div>
    );
  }

  if (selectedSubsystem === "Arm") {
    const armCameras = [
      { label: "Base Arm", id: 8 },
      { label: "Joint", id: 9 },
      { label: "End Effector", id: 10 },
      { label: "Gripper", id: 11 },
    ];

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
        {/* Control row: 2 panels side by side, auto height */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Arm Safety</div>
            <div style={{ fontSize: "12px", color: "#e8e8e8" }}>Emergency Stop: <b>{emergencyStop ? "ON" : "OFF"}</b></div>
            <button
              onClick={() => setEmergencyStop((prev) => !prev)}
              style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "8px 10px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
            >
              {emergencyStop ? "E-STOP ON" : "Emergency Stop"}
            </button>
          </div>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "4px", fontWeight: 800 }}>Clamp Distance to Fully Close</div>
              <input type="range" min={0} max={100} value={armClampDistance} onChange={(e) => setArmClampDistance(Number(e.target.value))} style={{ width: "100%" }} />
              <div style={{ color: "white", fontSize: "12px" }}>{armClampDistance}%</div>
            </div>
          </div>
        </div>
        {/* Cameras: 2×2 grid for portrait */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {armCameras.map((cam) => <CameraCard key={cam.label} camera={cam} />)}
        </div>
        <FullscreenOverlay />
      </div>
    );
  }

  if (selectedSubsystem === "Science") {
    const scienceCameras = [
      { label: "Science Cam 1", id: 12 },
      { label: "Science Cam 2", id: 13 },
      { label: "Science Cam 3", id: 14 },
    ];

    const graphBar = (value, color) => (
      <div style={{ height: "8px", background: "#252525", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color }} />
      </div>
    );

    return (
      <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", padding: "8px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
        {/* Control row: 2 panels side by side, auto height */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Science Imaging / Capture</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setPanoramaShots((n) => {
                  const next = n + 1;
                  setLastPanoramaLabel(`Panorama #${next} captured at ${new Date().toLocaleTimeString()}`);
                  return next;
                })}
                style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}
              >
                Panorama
              </button>
              <button onClick={() => setSciencePhotos((n) => n + 1)} style={{ flex: 1, borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700 }}>Take Picture</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
              <button
                onClick={() => setSciencePopup("panorama")}
                style={{ borderRadius: "6px", border: "1px solid #555", background: "#2f2f2f", color: "white", cursor: "pointer", fontWeight: 700 }}
              >
                Open Panorama Popup
              </button>
              <button
                onClick={() => setSciencePopup("tasks")}
                style={{ borderRadius: "6px", border: "1px solid #555", background: "#2f2f2f", color: "white", cursor: "pointer", fontWeight: 700 }}
              >
                Additional Science Tasks
              </button>
            </div>
            <div style={{ marginTop: "6px", color: "#ddd", fontSize: "11px" }}>
              Panoramas: {panoramaShots} | Photos: {sciencePhotos}
            </div>
          </div>
          <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
            <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Science Data Graphs</div>
            <div style={{ display: "grid", gap: "6px" }}>
              <button
                onClick={() => setSciencePopup("soil")}
                style={{ textAlign: "left", borderRadius: "6px", border: "1px solid #4d4d4d", background: "#2d2d2d", color: "#cfcfcf", fontSize: "10px", padding: "6px", cursor: "pointer" }}
              >
                Soil Moisture (Open Popup)
                <div style={{ marginTop: "5px" }}>{graphBar(72, "#16a34a")}</div>
              </button>
              <button
                onClick={() => setSciencePopup("spectral")}
                style={{ textAlign: "left", borderRadius: "6px", border: "1px solid #4d4d4d", background: "#2d2d2d", color: "#cfcfcf", fontSize: "10px", padding: "6px", cursor: "pointer" }}
              >
                Spectral Intensity (Open Popup)
                <div style={{ marginTop: "5px" }}>{graphBar(48, "#2563eb")}</div>
              </button>
              <div style={{ fontSize: "10px", color: "#cfcfcf" }}>Thermal Delta</div>
              {graphBar(35, "#f97316")}
            </div>
          </div>
        </div>
        {/* Cameras: portrait layout — Cam1 full width on top, Cam2+Cam3 side by side below */}
        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)", gap: "6px", minHeight: 0 }}>
          <CameraCard camera={scienceCameras[0]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
            <CameraCard camera={scienceCameras[1]} />
            <CameraCard camera={scienceCameras[2]} />
          </div>
        </div>
        <FullscreenOverlay />
        <SciencePopupOverlay />
      </div>
    );
  }

  return null;
}

function Sensors( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - Sensors Mode</h1>
    </div>
  );
}

function ROS2Entities({ selectedSubsystem, sharedRos, setSharedRos }) {
  const TOPIC_CONFIG = [
    { name: "/joint_states", type: "sensor_msgs/msg/JointState", subsystem: "Arm", canSubscribe: true, canPublish: false },
    { name: "/controller_input", type: "sensor_msgs/msg/Joy", subsystem: "Arm", canSubscribe: true, canPublish: false },
    { name: "/can_tx", type: "umdloop_theseus_can_messages/msg/CANA", subsystem: "Arm", canSubscribe: true, canPublish: false },
    { name: "/can_rx", type: "umdloop_theseus_can_messages/msg/CANA", subsystem: "Arm", canSubscribe: true, canPublish: false },
    { name: "/cmd_vel", type: "geometry_msgs/msg/Twist", subsystem: "Drive", canSubscribe: true, canPublish: true },
    { name: "/odom", type: "nav_msgs/msg/Odometry", subsystem: "Drive", canSubscribe: true, canPublish: false },
    { name: "/velocity_controller/commands", type: "std_msgs/msg/Float64MultiArray", subsystem: "Arm", canSubscribe: false, canPublish: true },
  ];

  const PUBLISH_TOPICS = TOPIC_CONFIG.filter((t) => t.canPublish);
  const SUBSCRIBE_TOPICS = TOPIC_CONFIG.filter((t) => t.canSubscribe);
  const typeByTopic = TOPIC_CONFIG.reduce((acc, topic) => {
    acc[topic.name] = topic.type;
    return acc;
  }, {});

  const [rosStatus, setRosStatus] = useState("connecting...");
  const [rosInstance, setRosInstance] = useState(null);
  const [messageLog, setMessageLog] = useState([]);
  const [pubTopic, setPubTopic] = useState(PUBLISH_TOPICS[0].name);
  const [pubMessageType, setPubMessageType] = useState(PUBLISH_TOPICS[0].type);
  const [publishStatus, setPublishStatus] = useState("");
  const [pubPayload, setPubPayload] = useState('{\n  "linear": {"x": 0.0, "y": 0.0, "z": 0.0},\n  "angular": {"x": 0.0, "y": 0.0, "z": 0.0}\n}');

  useEffect(() => {
    const ros = sharedRos || new ROSLIB.Ros({ url: getRosbridgeUrl() });
    const createdHere = !sharedRos;

    if (createdHere && setSharedRos) {
      setSharedRos(ros);
    }
    setRosInstance(ros);

    ros.on("connection", () => setRosStatus("connected"));
    ros.on("error", (error) => setRosStatus(`error: ${error?.toString?.() || error}`));
    ros.on("close", () => setRosStatus("closed"));

    const listeners = SUBSCRIBE_TOPICS.map((topic) => {
      const listener = new ROSLIB.Topic({
        ros,
        name: topic.name,
        messageType: topic.type,
      });

      listener.subscribe((message) => {
        const rendered = JSON.stringify(message, null, 2);
        setMessageLog((prev) => [
          {
            topic: topic.name,
            type: topic.type,
            subsystem: topic.subsystem,
            timestamp: new Date().toLocaleTimeString(),
            payload: rendered,
          },
          ...prev.slice(0, 199),
        ]);
      });

      return listener;
    });

    return () => {
      listeners.forEach((listener) => listener.unsubscribe());
      if (createdHere) {
        ros.close();
      }
    };
  }, [setSharedRos, sharedRos]);

  const loadTemplate = (topicName) => {
    if (topicName === "/cmd_vel") {
      setPubPayload('{\n  "linear": {"x": 0.2, "y": 0.0, "z": 0.0},\n  "angular": {"x": 0.0, "y": 0.0, "z": 0.0}\n}');
      return;
    }
    if (topicName === "/velocity_controller/commands") {
      setPubPayload('{\n  "data": [0.0, 0.0, 0.0, 0.0]\n}');
      return;
    }
    setPubPayload("{}");
  };

  const onTopicChange = (topicName) => {
    setPubTopic(topicName);
    setPubMessageType(typeByTopic[topicName] || "");
    loadTemplate(topicName);
  };

  const publishMessage = () => {
    if (!rosInstance) {
      setPublishStatus("Cannot publish: ROS not connected");
      return;
    }

    try {
      const parsedMessage = JSON.parse(pubPayload);
      const topic = new ROSLIB.Topic({
        ros: rosInstance,
        name: pubTopic,
        messageType: pubMessageType,
      });
      topic.publish(new ROSLIB.Message(parsedMessage));
      setPublishStatus(`Published to ${pubTopic}`);
      setTimeout(() => setPublishStatus(""), 3000);
    } catch (error) {
      setPublishStatus(`Publish failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1>{selectedSubsystem} - ROS2 Entities Mode</h1>
      <p style={{ marginTop: "8px" }}>Connection status: {rosStatus}</p>
      <p style={{ marginTop: "6px", opacity: 0.85 }}>
        Subscribed topics: {SUBSCRIBE_TOPICS.length} | Publishable topics: {PUBLISH_TOPICS.length}
      </p>

      <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "16px" }}>
        <div style={{ background: "#2b2b2b", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "14px" }}>
          <h3 style={{ marginTop: 0 }}>Publish</h3>

          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Topic</label>
          <select
            value={pubTopic}
            onChange={(e) => onTopicChange(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "6px", background: "#1e1e1e", color: "white", border: "1px solid #4a4a4a" }}
          >
            {PUBLISH_TOPICS.map((topic) => (
              <option key={topic.name} value={topic.name}>
                {topic.name} ({topic.subsystem})
              </option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Message Type</label>
          <input
            value={pubMessageType}
            onChange={(e) => setPubMessageType(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "6px", background: "#1e1e1e", color: "white", border: "1px solid #4a4a4a" }}
          />

          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>JSON Payload</label>
          <textarea
            value={pubPayload}
            onChange={(e) => setPubPayload(e.target.value)}
            rows={10}
            style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "6px", background: "#101010", color: "#d4d4d4", border: "1px solid #4a4a4a", fontFamily: "Consolas, monospace" }}
          />

          <button
            onClick={publishMessage}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #175f17", background: "#228b22", color: "white", fontWeight: 700, cursor: "pointer" }}
          >
            Publish Message
          </button>

          {publishStatus && <p style={{ marginTop: "8px" }}>{publishStatus}</p>}
        </div>

        <div style={{ background: "#2b2b2b", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "14px" }}>
          <h3 style={{ marginTop: 0 }}>Received Messages (All Listed Topics)</h3>
          <div style={{ maxHeight: "520px", overflowY: "auto", background: "#101010", borderRadius: "8px", padding: "10px", border: "1px solid #444" }}>
            {messageLog.length === 0 ? (
              <p style={{ margin: 0, color: "#aaa" }}>No messages received yet.</p>
            ) : (
              messageLog.map((entry, idx) => (
                <div key={`${entry.topic}-${entry.timestamp}-${idx}`} style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #2f2f2f" }}>
                  <div style={{ fontSize: "12px", color: "#9cc4ff", marginBottom: "4px" }}>
                    {entry.timestamp} | {entry.subsystem} | {entry.topic} ({entry.type})
                  </div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#d4ffd4", fontSize: "12px" }}>
                    {entry.payload}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const NAVIGATION_BUTTONS = [
  "Object Detection",
  "Control Panel",
  "Placeholder2",
];

function Navigation({ selectedNavItem }) {
  const [running, setRunning] = useState(false);
  const [pid, setPid] = useState(null);
  const [error, setError] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [navMode, setNavMode] = useState("GNSS");

  const [pathPlanStatus, setPathPlanStatus] = useState("");

  const fetchStatus = async () => {
    try {
      setError("");
      const res = await fetch("http://127.0.0.1:5000/object-detection/status");
      const data = await res.json();
      setRunning(Boolean(data.running));
      setPid(data.pid ?? null);
    } catch (e) {
      setError("Backend unreachable");
      setRunning(false);
      setPid(null);
    }
  };

  const startDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/start", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      setError("Failed to start");
    }
  };

  const stopDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/stop", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      setError("Failed to stop");
    }
  };

  const onPathPlan = async () => {
    console.log("Path plan clicked", { latitude, longitude, navMode });
    try {

      setError("");
      setPathPlanStatus("Sending...");

      const res = await fetch("http://127.0.0.1:5000/navigation/path-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          position_tolerance: 0.0,
          mode: navMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setPathPlanStatus("");
        setError(data.error || data.message || "Path plan failed");
        return;
      }

      setPathPlanStatus(data.message || "Request sent");
    } catch (e) {
      setPathPlanStatus("");
      setError("Backend unreachable");
    }
  };

  // When you enter Object Detection tab, start polling status
  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return;

    fetchStatus(); // initial fetch
    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, [selectedNavItem]);

  // Optional: auto-start when tab is selected
  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return;
    startDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNavItem]);

  return (
    <div>
      <h1>{selectedNavItem} - Navigation Mode</h1>

      {selectedNavItem === "Object Detection" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {/* Status Row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "fit-content",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                fontWeight: 800,
                background: running ? "#1f7a1f" : "#8a1f1f",
              }}
            >
              {running ? "RUNNING ✅" : "STOPPED ❌"}
            </div>

            <div style={{ opacity: 0.9 }}>
              PID: <span style={{ fontWeight: 700 }}>{pid ?? "—"}</span>
            </div>

            {error && (
              <div style={{ color: "#ffb3b3", fontWeight: 700 }}>
                {error}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={startDetection}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Start
            </button>

            <button
              onClick={stopDetection}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Stop
            </button>

            <button
              onClick={fetchStatus}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Refresh
            </button>
          </div>

          {/* Camera */}
          <div style={{ textAlign: "center" }}>
            <h2>Object Detection Stream</h2>
            <img
              src="http://127.0.0.1:5000/object-detection/stream/0"
              alt="Object Detection Stream"
              style={{ width: "640px", height: "480px" }}
            />
          </div>

        </div>
      )}

      {selectedNavItem === "Control Panel" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "520px",
              textAlign: "left",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Control Panel</h2>

            {/* Latitude / Longitude */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Latitude</label>
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 38.4239116"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "2px solid #1f1e1eff",
                    background: "#3d3d3d",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Longitude</label>
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. -110.7849055"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "2px solid #1f1e1eff",
                    background: "#3d3d3d",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Radio Options */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Mode</div>

              {["GNSS", "Object Detection", "Aruco Tag"].map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    border: "2px solid #1f1e1eff",
                    background: navMode === opt ? "#262626ff" : "#3d3d3d",
                    cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="radio"
                    name="navMode"
                    value={opt}
                    checked={navMode === opt}
                    onChange={() => setNavMode(opt)}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span style={{ fontWeight: 800 }}>{opt}</span>
                </label>
              ))}
            </div>

            {/* Optional: show what's selected */}
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {/* Path Plan Button */}
              <button
                onClick={onPathPlan}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "9999px",
                  border: "2px solid #1f1e1eff",
                  background: "#530000ff",
                  color: "white",
                  fontWeight: 900,
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Path Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }

export default function LoopGui() {
  console.log("🔥 LOOP GUI RENDERED");
  const [selectedMode, setSelectedMode] = useState(modes[0]);
  const [selectedSubsystem, setSelectedSubsystem] = useState(subsystems[0]);
  const [selectedNavItem, setSelectedNavItem] = useState(NAVIGATION_BUTTONS[0]);
  const [sharedRos, setSharedRos] = useState(null);

  const showSubsystemBar = selectedMode !== "Navigation" && selectedMode !== "Drone" && selectedMode !== "Technician";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#1a1a1a" }}>
      {/* Top Navigation Bar */}
      <NavigationBar selectedMode={selectedMode} setSelectedMode={setSelectedMode} />

      {/* Subsystem Bar (horizontal) - only show when not in Cameras mode */}
      {showSubsystemBar && (
        <SubsystemBar
          buttons={subsystems}
          selected={selectedSubsystem}
          setSelected={setSelectedSubsystem}
        />
      )}

      {/* Main Content Area - full width for vertical monitors */}
      <div style={{ flex: 1, minHeight: 0, overflow: selectedMode === "Navigation" || selectedMode === "Technician" ? "auto" : "hidden" }}>
        <PageContent
          selectedMode={selectedMode}
          selectedSubsystem={selectedSubsystem}
          setSelectedSubsystem={setSelectedSubsystem}
          selectedNavItem={selectedNavItem}
          setSelectedNavItem={setSelectedNavItem}
          sharedRos={sharedRos}
          setSharedRos={setSharedRos}
        />
      </div>
    </div>
  );
}
