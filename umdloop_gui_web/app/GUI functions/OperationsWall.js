"use client";

import React, { useEffect, useMemo, useState } from "react";
import ROSLIB from "roslib";
import MapView from "./MapView";
import { getApiBaseUrl, getRosbridgeUrl } from "../config";
import { TATTU_HV_6S_22000, buildBatteryHealthSnapshot } from "../battery";

const CONTROL_MODES = ["Drive Command", "Arm Command", "Science Command", "Emergency Stop"];

const ARM_PRESETS = [
  { name: "Arm Default", feeds: { mainTop: 8, mainBottom: 10, auxTop: 9, auxBottom: 11 } },
  { name: "Arm Closeup", feeds: { mainTop: 10, mainBottom: 11, auxTop: 8, auxBottom: 9 } },
];

const DRIVE_PRESETS = [
  { name: "Drive Default", feeds: { leftTop: 15, leftBottom: 16, rightTop: 17, rightBottom: 18 } },
  { name: "Drive Wheels", feeds: { leftTop: 0, leftBottom: 2, rightTop: 4, rightBottom: 6 } },
];

function CameraFeed({ cameraId, label, height = 170, rotateDeg = 0 }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid #353535",
        background: "#111",
        position: "relative",
        height,
      }}
    >
      <img
        src={`http://127.0.0.1:5000/camera/${cameraId}`}
        alt={label}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `rotate(${rotateDeg}deg)`,
          transformOrigin: "center center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          background: "rgba(0,0,0,0.55)",
          padding: "3px 7px",
          borderRadius: 9999,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MonitorShell({ title, children }) {
  return (
    <section
      style={{
        minWidth: 300,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "#222",
        border: "2px solid #3f3f3f",
        borderRadius: 18,
        padding: 10,
        gap: 10,
      }}
    >
      <div style={{ color: "#ddd", fontWeight: 900, fontSize: 13, letterSpacing: 0.4 }}>
        {title}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

export default function OperationsWall({ pane = "all", layout = "default" }) {
  const showControlBar = pane !== "drone";
  const [activeControlMode, setActiveControlMode] = useState(CONTROL_MODES[0]);
  const [armPresetIdx, setArmPresetIdx] = useState(0);
  const [drivePresetIdx, setDrivePresetIdx] = useState(0);
  const [armRotate, setArmRotate] = useState(0);
  const [driveRotate, setDriveRotate] = useState(0);
  const [gps, setGps] = useState({ latitude: 38.9897, longitude: -76.9378 });
  const [speedMps, setSpeedMps] = useState(0);
  const [rosStatus, setRosStatus] = useState("connecting...");
  const [goalLat, setGoalLat] = useState("38.9897");
  const [goalLon, setGoalLon] = useState("-76.9378");
  const [goalMode, setGoalMode] = useState("GNSS");
  const [goalStatus, setGoalStatus] = useState("");
  const [systemStats, setSystemStats] = useState({
    batteryDrive: 94,
    batteryArm: 88,
    radio: 82,
    ledState: "GREEN",
    sensorTemp: 41.2,
  });
  const apiBaseUrl = getApiBaseUrl();

  const armFeeds = ARM_PRESETS[armPresetIdx].feeds;
  const driveFeeds = DRIVE_PRESETS[drivePresetIdx].feeds;

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });

    ros.on("connection", () => setRosStatus("connected"));
    ros.on("error", () => setRosStatus("error"));
    ros.on("close", () => setRosStatus("closed"));

    const gpsTopic = new ROSLIB.Topic({
      ros,
      name: "/gps/fix",
      messageType: "sensor_msgs/msg/NavSatFix",
    });
    gpsTopic.subscribe((msg) => {
      if (msg.latitude != null && msg.longitude != null) {
        setGps({ latitude: msg.latitude, longitude: msg.longitude });
      }
    });

    const odomTopic = new ROSLIB.Topic({
      ros,
      name: "/odom",
      messageType: "nav_msgs/msg/Odometry",
    });
    odomTopic.subscribe((msg) => {
      const linear = msg?.twist?.twist?.linear;
      if (!linear) return;
      const mag = Math.sqrt((linear.x || 0) ** 2 + (linear.y || 0) ** 2 + (linear.z || 0) ** 2);
      setSpeedMps(mag);
    });

    return () => {
      gpsTopic.unsubscribe();
      odomTopic.unsubscribe();
      ros.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRadioStatus = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/radio/status`);
        const data = await res.json();
        if (cancelled) return;

        setSystemStats((prev) => ({
          ...prev,
          radio: Math.max(0, Math.min(100, Number(data.quality_percent) || 0)),
        }));
      } catch (_) {
        if (cancelled) return;
        setSystemStats((prev) => ({ ...prev, radio: 0 }));
      }
    };

    loadRadioStatus();
    const id = setInterval(loadRadioStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    const id = setInterval(() => {
      setSystemStats((prev) => ({
        ...prev,
        batteryDrive: Math.max(10, prev.batteryDrive - 0.04),
        batteryArm: Math.max(10, prev.batteryArm - 0.03),
        sensorTemp: Math.max(20, Math.min(95, prev.sensorTemp + (Math.random() * 0.8 - 0.4))),
      }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const driveBattery = buildBatteryHealthSnapshot({
    socPercent: systemStats.batteryDrive,
    temperatureC: systemStats.sensorTemp,
  });
  const armBattery = buildBatteryHealthSnapshot({
    socPercent: systemStats.batteryArm,
    temperatureC: systemStats.sensorTemp,
  });

  const odomSummary = useMemo(() => {
    return `${speedMps.toFixed(2)} m/s`;
  }, [speedMps]);

  const submitGoal = async () => {
    try {
      setGoalStatus("Sending...");
      const res = await fetch(`${apiBaseUrl}/navigation/path-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(goalLat),
          longitude: Number(goalLon),
          position_tolerance: 0.0,
          mode: goalMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setGoalStatus(data.error || data.message || "Failed");
        return;
      }
      setGoalStatus(data.message || "Sent");
    } catch (err) {
      setGoalStatus("Backend unreachable");
    }
  };

  const armMonitor = (
    <MonitorShell title="Arm Related Camera Views">
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gridTemplateRows: "1fr 1fr", gap: 8, height: "100%" }}>
        <CameraFeed cameraId={armFeeds.mainTop} label={`Arm Main A (Cam ${armFeeds.mainTop})`} rotateDeg={armRotate} />
        <CameraFeed cameraId={armFeeds.auxTop} label={`Arm Aux A (Cam ${armFeeds.auxTop})`} height={150} rotateDeg={armRotate} />
        <CameraFeed cameraId={armFeeds.mainBottom} label={`Arm Main B (Cam ${armFeeds.mainBottom})`} rotateDeg={armRotate} />
        <CameraFeed cameraId={armFeeds.auxBottom} label={`Arm Aux B (Cam ${armFeeds.auxBottom})`} height={150} rotateDeg={armRotate} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {ARM_PRESETS.map((preset, idx) => (
          <button
            key={preset.name}
            onClick={() => setArmPresetIdx(idx)}
            style={{
              flex: 1,
              borderRadius: 9999,
              border: "1px solid #5b5b5b",
              background: idx === armPresetIdx ? "#6d1111" : "#2f2f2f",
              color: "white",
              padding: "7px 10px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {preset.name}
          </button>
        ))}
        <button
          onClick={() => setArmRotate((prev) => (prev + 90) % 360)}
          style={{ borderRadius: 9999, border: "1px solid #5b5b5b", background: "#2f2f2f", color: "white", padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
        >
          Rotate
        </button>
      </div>
    </MonitorShell>
  );

  const driveMonitor = (
    <MonitorShell title="Drive Related Camera Views">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, height: "100%" }}>
        <CameraFeed cameraId={driveFeeds.leftTop} label={`Drive Left A (Cam ${driveFeeds.leftTop})`} rotateDeg={driveRotate} />
        <CameraFeed cameraId={driveFeeds.rightTop} label={`Drive Right A (Cam ${driveFeeds.rightTop})`} height={150} rotateDeg={driveRotate} />
        <CameraFeed cameraId={driveFeeds.leftBottom} label={`Drive Left B (Cam ${driveFeeds.leftBottom})`} rotateDeg={driveRotate} />
        <CameraFeed cameraId={driveFeeds.rightBottom} label={`Drive Right B (Cam ${driveFeeds.rightBottom})`} height={150} rotateDeg={driveRotate} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {DRIVE_PRESETS.map((preset, idx) => (
          <button
            key={preset.name}
            onClick={() => setDrivePresetIdx(idx)}
            style={{
              flex: 1,
              borderRadius: 9999,
              border: "1px solid #5b5b5b",
              background: idx === drivePresetIdx ? "#6d1111" : "#2f2f2f",
              color: "white",
              padding: "7px 10px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {preset.name}
          </button>
        ))}
        <button
          onClick={() => setDriveRotate((prev) => (prev + 90) % 360)}
          style={{ borderRadius: 9999, border: "1px solid #5b5b5b", background: "#2f2f2f", color: "white", padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
        >
          Rotate
        </button>
      </div>
    </MonitorShell>
  );

  const mapMonitor = (
    <MonitorShell title="Map">
      <div style={{ height: "100%", minHeight: 0, borderRadius: 14, overflow: "hidden", border: "1px solid #3d3d3d" }}>
        <MapView selectedSubsystem="Drive" />
      </div>
    </MonitorShell>
  );

  const droneMonitor = (
    <MonitorShell title="Drone OSD">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
        <div style={{ position: "relative", flex: 1, minHeight: 160, borderRadius: 16, overflow: "hidden", border: "2px solid #3b3b3b", background: "#101010" }}>
          <img src="http://127.0.0.1:5000/object-detection/stream/0" alt="Drone feed primary" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 8, left: 8, fontSize: 12, fontWeight: 800, color: "#d8ffd8", background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "5px 8px" }}>
            SPD {odomSummary}
          </div>
        </div>
        <div style={{ position: "relative", flex: 1, minHeight: 160, borderRadius: 16, overflow: "hidden", border: "2px solid #3b3b3b", background: "#101010" }}>
          <img src="http://127.0.0.1:5000/camera/15" alt="Drone feed secondary" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 8, left: 8, fontSize: 12, fontWeight: 800, color: "#d8ffd8", background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "5px 8px" }}>
            GPS {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
          </div>
        </div>
      </div>
    </MonitorShell>
  );

  const roverStatusMonitor = (
    <MonitorShell title="Rover Status & Controls">
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
    </MonitorShell>
  );

  const paneLookup = {
    arm: armMonitor,
    drive: driveMonitor,
    map: mapMonitor,
    drone: droneMonitor,
    status: roverStatusMonitor,
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 10,
        background: "#141414",
      }}
    >
      {showControlBar && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            background: "#242424",
            borderRadius: 12,
            border: "1px solid #383838",
            padding: 10,
          }}
        >
          <div style={{ color: "#ddd", fontSize: 12, fontWeight: 800 }}>Active Control Mode:</div>
          {CONTROL_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveControlMode(mode)}
              style={{
                border: "1px solid #5a5a5a",
                borderRadius: 9999,
                padding: "5px 11px",
                background: activeControlMode === mode ? "#7c1919" : "#303030",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {mode}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#bfbfbf" }}>
            ROS: <span style={{ fontWeight: 800 }}>{rosStatus}</span>
          </div>
        </div>
      )}

      {pane === "all" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: layout === "vertical" ? "1fr" : "repeat(5, minmax(300px, 1fr))",
            gap: 10,
            overflowX: layout === "vertical" ? "hidden" : "auto",
            overflowY: layout === "vertical" ? "auto" : "hidden",
            flex: 1,
            minHeight: 0,
          }}
        >
          {armMonitor}
          {driveMonitor}
          {mapMonitor}
          {droneMonitor}
          {roverStatusMonitor}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
            flex: 1,
            minHeight: "calc(100vh - 220px)",
          }}
        >
          {paneLookup[pane] || mapMonitor}
        </div>
      )}
    </div>
  );
}
