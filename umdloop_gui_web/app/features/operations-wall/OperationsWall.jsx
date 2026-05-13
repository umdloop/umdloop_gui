"use client";

import React, { useEffect, useMemo, useState } from "react";
import ROSLIB from "roslib";
import MapView from "../../components/map/MapView";
import { getRosbridgeUrl } from "../../config";
import { buildBatteryHealthSnapshot } from "../../lib/battery";
import { getRadioStatus, sendPathPlan } from "../../lib/api";
import ArmMonitor from "./ArmMonitor";
import DriveMonitor from "./DriveMonitor";
import DroneMonitor from "./DroneMonitor";
import RoverStatusMonitor from "./RoverStatusMonitor";

const CONTROL_MODES = ["Drive Command", "Arm Command", "Science Command", "Emergency Stop"];

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
        const data = await getRadioStatus();
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
  }, []);

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
      const data = await sendPathPlan({
        latitude: Number(goalLat),
        longitude: Number(goalLon),
        positionTolerance: 0.0,
        mode: goalMode,
      });
      if (data.ok === false) {
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
      <ArmMonitor
        armPresetIdx={armPresetIdx}
        setArmPresetIdx={setArmPresetIdx}
        armRotate={armRotate}
        setArmRotate={setArmRotate}
      />
    </MonitorShell>
  );

  const driveMonitor = (
    <MonitorShell title="Drive Related Camera Views">
      <DriveMonitor
        drivePresetIdx={drivePresetIdx}
        setDrivePresetIdx={setDrivePresetIdx}
        driveRotate={driveRotate}
        setDriveRotate={setDriveRotate}
      />
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
      <DroneMonitor odomSummary={odomSummary} gps={gps} />
    </MonitorShell>
  );

  const roverStatusMonitor = (
    <MonitorShell title="Rover Status & Controls">
      <RoverStatusMonitor
        driveBattery={driveBattery}
        armBattery={armBattery}
        systemStats={systemStats}
        setSystemStats={setSystemStats}
        goalLat={goalLat}
        setGoalLat={setGoalLat}
        goalLon={goalLon}
        setGoalLon={setGoalLon}
        goalMode={goalMode}
        setGoalMode={setGoalMode}
        goalStatus={goalStatus}
        submitGoal={submitGoal}
      />
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
