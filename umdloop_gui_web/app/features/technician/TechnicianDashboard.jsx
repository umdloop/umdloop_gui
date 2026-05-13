"use client";

import React, { useEffect, useState } from "react";
import ROSLIB from "roslib";
import { TECHNICIAN_COMMAND_TOPICS, TECHNICIAN_TOPICS, getRosbridgeUrl } from "../../config";
import { TATTU_HV_6S_22000, buildBatteryHealthSnapshot } from "../../lib/battery";
import MissionClock from "./MissionClock";
import PowerPanel from "./PowerPanel";
import CommsPanel from "./CommsPanel";
import MobilityPanel from "./MobilityPanel";
import DiagnosticsPanel from "./DiagnosticsPanel";

export default function TechnicianDashboard() {
  const [inputHours, setInputHours] = useState("00");
  const [inputMinutes, setInputMinutes] = useState("10");
  const [inputSeconds, setInputSeconds] = useState("00");
  const [configuredSeconds, setConfiguredSeconds] = useState(600);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);
  const [ledState, setLedState] = useState("GREEN");
  const [laserWarningOn, setLaserWarningOn] = useState(false);
  const [showCanPopup, setShowCanPopup] = useState(false);
  const [rosStatus, setRosStatus] = useState("connecting...");
  const [bytesPerSecond, setBytesPerSecond] = useState(0);
  const [roverVelocityMps, setRoverVelocityMps] = useState(0);
  const [headingDeg, setHeadingDeg] = useState(null);
  const [motionStats, setMotionStats] = useState({
    distanceM: 0,
    maxSpeedMps: 0,
    yawRateDps: 0,
    lastPosition: null,
  });
  const [topicHeartbeat, setTopicHeartbeat] = useState({
    localizationOdom: 0,
    filteredImu: 0,
    jointStates: 0,
    heading: 0,
    diagnostics: 0,
  });
  const [tilt, setTilt] = useState({ rollDeg: 0, pitchDeg: 0, magnitudeDeg: 0, vectorLabel: "CENTERED" });
  const [imuDynamics, setImuDynamics] = useState({
    yawRateDegs: 0,
    accelMagnitude: 0,
    accelState: "STEADY",
  });
  const [sensorTemps, setSensorTemps] = useState({
    driveController: 41.2,
    armController: 39.8,
    batteryPack: 35.1,
    avionics: 37.4,
  });
  const [powerStats, setPowerStats] = useState({ batteryDrive: 94, batteryArm: 88 });
  const [radioLevel, setRadioLevel] = useState(82);
  const [topicAvailability, setTopicAvailability] = useState({
    batteryDrive: false,
    batteryArm: false,
    radio: false,
    temperatures: false,
    ledState: false,
    heading: false,
    diagnostics: false,
  });
  const [diagnosticsSummary, setDiagnosticsSummary] = useState({
    ok: 0,
    warn: 0,
    error: 0,
    stale: 0,
    topIssue: "Waiting for diagnostics",
  });
  const [diagnosticItems, setDiagnosticItems] = useState([]);
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
  const [motorCommandStatus, setMotorCommandStatus] = useState("No command sent");
  const rosRef = React.useRef(null);
  const hardStopBurstRef = React.useRef(null);

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
    rosRef.current = ros;
    let byteCounter = 0;

    const markTopicAvailable = (key) => {
      setTopicAvailability((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    };

    const markHeartbeat = (key) => {
      setTopicHeartbeat((prev) => ({ ...prev, [key]: Date.now() }));
    };

    const parseMetric = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

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

    const odomTopic = new ROSLIB.Topic({
      ros,
      name: TECHNICIAN_TOPICS.localizationOdom.name,
      messageType: TECHNICIAN_TOPICS.localizationOdom.messageType,
    });
    odomTopic.subscribe((msg) => {
      countBytes(msg);
      markHeartbeat("localizationOdom");
      const linear = msg?.twist?.twist?.linear;
      const angular = msg?.twist?.twist?.angular;
      const position = msg?.pose?.pose?.position;
      if (!linear) return;
      const mag = Math.sqrt((linear.x || 0) ** 2 + (linear.y || 0) ** 2 + (linear.z || 0) ** 2);
      setRoverVelocityMps(mag);
      setMotionStats((prev) => {
        let distanceM = prev.distanceM;
        if (position && Number.isFinite(position.x) && Number.isFinite(position.y) && prev.lastPosition) {
          const dx = position.x - prev.lastPosition.x;
          const dy = position.y - prev.lastPosition.y;
          const delta = Math.sqrt(dx * dx + dy * dy);
          if (delta < 5) {
            distanceM += delta;
          }
        }
        return {
          distanceM,
          maxSpeedMps: Math.max(prev.maxSpeedMps, mag),
          yawRateDps: Number.isFinite(angular?.z) ? angular.z * (180 / Math.PI) : prev.yawRateDps,
          lastPosition: position && Number.isFinite(position.x) && Number.isFinite(position.y) ? { x: position.x, y: position.y } : prev.lastPosition,
        };
      });
    });

    const imuTopic = new ROSLIB.Topic({
      ros,
      name: TECHNICIAN_TOPICS.filteredImu.name,
      messageType: TECHNICIAN_TOPICS.filteredImu.messageType,
    });
    imuTopic.subscribe((msg) => {
      countBytes(msg);
      markHeartbeat("filteredImu");
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
      const angularVelocity = msg?.angular_velocity;
      const linearAcceleration = msg?.linear_acceleration;
      const accelMagnitude = Math.sqrt((linearAcceleration?.x || 0) ** 2 + (linearAcceleration?.y || 0) ** 2 + (linearAcceleration?.z || 0) ** 2);
      setImuDynamics({
        yawRateDegs: Number.isFinite(angularVelocity?.z) ? angularVelocity.z * (180 / Math.PI) : 0,
        accelMagnitude,
        accelState: accelMagnitude > 10.8 ? "IMPULSE" : accelMagnitude > 9.95 ? "ACTIVE" : "STEADY",
      });
      setTilt({
        rollDeg,
        pitchDeg,
        magnitudeDeg,
        vectorLabel: magnitudeDeg < 0.4 ? "CENTERED" : `${pitchDeg >= 0 ? "FRONT" : "BACK"}-${rollDeg >= 0 ? "RIGHT" : "LEFT"}`,
      });
    });

    const jointStateTopic = new ROSLIB.Topic({
      ros,
      name: TECHNICIAN_TOPICS.jointStates.name,
      messageType: TECHNICIAN_TOPICS.jointStates.messageType,
    });
    jointStateTopic.subscribe((msg) => {
      countBytes(msg);
      markHeartbeat("jointStates");
      const names = msg?.name || [];
      const positions = msg?.position || [];
      const velocities = msg?.velocity || [];
      const efforts = msg?.effort || [];
      const idxByPatterns = (patterns) => names.findIndex((n) => patterns.some((p) => n.toLowerCase().includes(p)));
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
      const nextWheel = { fl: { velocity: 0, current: 0 }, fr: { velocity: 0, current: 0 }, rl: { velocity: 0, current: 0 }, rr: { velocity: 0, current: 0 } };
      Object.keys(wheelPatterns).forEach((key) => {
        const idx = idxByPatterns(wheelPatterns[key]);
        if (idx >= 0) nextWheel[key] = { velocity: Number(velocities[idx] || 0), current: Number(efforts[idx] || 0) };
      });
      setWheelDiag(nextWheel);
      const nextSteer = { fl: { orientationDeg: 0, current: 0 }, fr: { orientationDeg: 0, current: 0 }, rl: { orientationDeg: 0, current: 0 }, rr: { orientationDeg: 0, current: 0 } };
      Object.keys(steerPatterns).forEach((key) => {
        const idx = idxByPatterns(steerPatterns[key]);
        if (idx >= 0) nextSteer[key] = { orientationDeg: Number((positions[idx] || 0) * (180 / Math.PI)), current: Number(efforts[idx] || 0) };
      });
      setSteerDiag(nextSteer);
    });

    const headingTopic = new ROSLIB.Topic({
      ros,
      name: TECHNICIAN_TOPICS.heading.name,
      messageType: TECHNICIAN_TOPICS.heading.messageType,
    });
    headingTopic.subscribe((msg) => {
      countBytes(msg);
      markHeartbeat("heading");
      const heading = parseMetric(msg?.data ?? msg?.heading_deg ?? msg?.heading);
      if (heading != null) {
        setHeadingDeg(heading);
        markTopicAvailable("heading");
      }
    });

    const diagnosticsTopic = new ROSLIB.Topic({
      ros,
      name: TECHNICIAN_TOPICS.diagnostics.name,
      messageType: TECHNICIAN_TOPICS.diagnostics.messageType,
    });
    diagnosticsTopic.subscribe((msg) => {
      countBytes(msg);
      markHeartbeat("diagnostics");
      const statuses = Array.isArray(msg?.status) ? msg.status : [];
      const nextSummary = statuses.reduce((acc, status) => {
        const level = Number(status?.level);
        if (level === 1) acc.warn += 1;
        else if (level === 2) acc.error += 1;
        else if (level === 3) acc.stale += 1;
        else acc.ok += 1;
        return acc;
      }, { ok: 0, warn: 0, error: 0, stale: 0, topIssue: "Diagnostics nominal" });
      const topIssue = statuses.find((status) => Number(status?.level) > 0);
      nextSummary.topIssue = topIssue?.name || (statuses.length > 0 ? "Diagnostics nominal" : "Waiting for diagnostics");
      setDiagnosticsSummary(nextSummary);
      setDiagnosticItems(
        statuses
          .map((status) => ({
            name: status?.name || "Unnamed Diagnostic",
            level: Number(status?.level) || 0,
            message: status?.message || "No message provided",
            hardwareId: status?.hardware_id || "N/A",
            values: Array.isArray(status?.values)
              ? status.values.filter((entry) => entry?.key && entry?.value).slice(0, 3).map((entry) => `${entry.key}: ${entry.value}`)
              : [],
          }))
          .sort((a, b) => b.level - a.level)
          .slice(0, 6)
      );
      markTopicAvailable("diagnostics");
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
      headingTopic.unsubscribe();
      diagnosticsTopic.unsubscribe();
      if (hardStopBurstRef.current) {
        clearInterval(hardStopBurstRef.current);
        hardStopBurstRef.current = null;
      }
      if (rosRef.current === ros) {
        rosRef.current = null;
      }
      ros.close();
    };
  }, []);

  const publishTechnicianCommand = (topicConfig, payload) => {
    if (!rosRef.current) throw new Error("ROS is not connected");
    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicConfig.name,
      messageType: topicConfig.messageType,
    });
    topic.publish(new ROSLIB.Message(payload));
  };

  const sendHardMotorStop = () => {
    try {
      if (!rosRef.current) throw new Error("ROS is not connected");
      if (hardStopBurstRef.current) clearInterval(hardStopBurstRef.current);

      const twistPayload = { linear: { x: 0.0, y: 0.0, z: 0.0 }, angular: { x: 0.0, y: 0.0, z: 0.0 } };
      const stampedPayload = { header: { stamp: { sec: 0, nanosec: 0 }, frame_id: "base_link" }, twist: twistPayload };

      let burstCount = 0;
      const publishBurst = () => {
        if (TECHNICIAN_COMMAND_TOPICS.preemptTeleop?.name) publishTechnicianCommand(TECHNICIAN_COMMAND_TOPICS.preemptTeleop, {});
        TECHNICIAN_COMMAND_TOPICS.hardStopTwist.forEach((topicConfig) => publishTechnicianCommand(topicConfig, twistPayload));
        TECHNICIAN_COMMAND_TOPICS.hardStopStamped.forEach((topicConfig) => publishTechnicianCommand(topicConfig, stampedPayload));
        burstCount += 1;
        if (burstCount >= 8 && hardStopBurstRef.current) {
          clearInterval(hardStopBurstRef.current);
          hardStopBurstRef.current = null;
        }
      };

      publishBurst();
      hardStopBurstRef.current = setInterval(publishBurst, 120);
      setMotorEnabled({
        wheelFL: false,
        wheelFR: false,
        wheelRL: false,
        wheelRR: false,
        steerFL: false,
        steerFR: false,
        steerRL: false,
        steerRR: false,
      });
      setMotorCommandStatus(`Stop burst sent across ${TECHNICIAN_COMMAND_TOPICS.hardStopTwist.length + TECHNICIAN_COMMAND_TOPICS.hardStopStamped.length} drive topics`);
    } catch (error) {
      setMotorCommandStatus(`Stop failed: ${error.message}`);
    }
  };

  const driveLoadCurrentA = Math.max(
    2.5,
    Object.values(wheelDiag).reduce((sum, wheel) => sum + Math.abs(wheel.current), 0) + Object.values(steerDiag).reduce((sum, steer) => sum + Math.abs(steer.current), 0) * 0.35
  );
  const armLoadCurrentA = laserWarningOn ? 7.5 : 4.0;
  const driveBattery = buildBatteryHealthSnapshot({ socPercent: powerStats.batteryDrive, loadCurrentA: driveLoadCurrentA, temperatureC: sensorTemps.batteryPack });
  const armBattery = buildBatteryHealthSnapshot({ socPercent: powerStats.batteryArm, loadCurrentA: armLoadCurrentA, temperatureC: sensorTemps.armController });

  useEffect(() => {
    const id = setInterval(() => {
      const intervalHours = 1.2 / 3600;
      if (!topicAvailability.batteryDrive || !topicAvailability.batteryArm) {
        setPowerStats((prev) => ({
          batteryDrive: topicAvailability.batteryDrive ? prev.batteryDrive : Math.max(0, prev.batteryDrive - ((driveLoadCurrentA * intervalHours) / TATTU_HV_6S_22000.capacityAh) * 100),
          batteryArm: topicAvailability.batteryArm ? prev.batteryArm : Math.max(0, prev.batteryArm - ((armLoadCurrentA * intervalHours) / TATTU_HV_6S_22000.capacityAh) * 100),
        }));
      }
      if (!topicAvailability.temperatures) {
        setSensorTemps((prev) => ({
          driveController: Math.max(20, Math.min(95, prev.driveController + (driveLoadCurrentA > 20 ? 0.22 : -0.08) + (Math.random() * 0.35 - 0.18))),
          armController: Math.max(20, Math.min(95, prev.armController + (laserWarningOn ? 0.1 : -0.03) + (Math.random() * 0.25 - 0.12))),
          batteryPack: Math.max(20, Math.min(95, prev.batteryPack + (driveLoadCurrentA > 28 ? 0.16 : -0.04) + (Math.random() * 0.22 - 0.11))),
          avionics: Math.max(20, Math.min(95, prev.avionics + (Math.random() * 0.28 - 0.14))),
        }));
      }
      if (!topicAvailability.radio) {
        setRadioLevel((prev) => Math.max(0, Math.min(100, prev + (Math.random() * 2.5 - 1.25))));
      }
    }, 1200);
    return () => clearInterval(id);
  }, [armLoadCurrentA, driveLoadCurrentA, laserWarningOn, topicAvailability]);

  const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const applyTimer = () => {
    const h = Math.max(0, parseInt(inputHours, 10) || 0);
    const m = Math.max(0, parseInt(inputMinutes, 10) || 0);
    const s = Math.max(0, parseInt(inputSeconds, 10) || 0);
    const total = h * 3600 + m * 60 + s;
    setConfiguredSeconds(total);
    setRemainingSeconds(total);
    setTimerRunning(false);
  };

  const telemetryTopicStates = [
    { label: "Odom", key: "localizationOdom", topic: TECHNICIAN_TOPICS.localizationOdom.name },
    { label: "IMU", key: "filteredImu", topic: TECHNICIAN_TOPICS.filteredImu.name },
    { label: "Joints", key: "jointStates", topic: TECHNICIAN_TOPICS.jointStates.name },
    { label: "Heading", key: "heading", topic: TECHNICIAN_TOPICS.heading.name },
    { label: "Diagnostics", key: "diagnostics", topic: TECHNICIAN_TOPICS.diagnostics.name },
  ].map((item) => ({ ...item, ageMs: topicHeartbeat[item.key] ? Date.now() - topicHeartbeat[item.key] : null }));
  const freshTelemetryCount = telemetryTopicStates.filter((item) => item.ageMs != null && item.ageMs <= 2500).length;
  const staleTelemetry = rosStatus !== "connected";
  const jointTelemetryFresh = topicHeartbeat.jointStates && Date.now() - topicHeartbeat.jointStates <= 2500;
  const odomTelemetryFresh = topicHeartbeat.localizationOdom && Date.now() - topicHeartbeat.localizationOdom <= 2500;
  const imuTelemetryFresh = topicHeartbeat.filteredImu && Date.now() - topicHeartbeat.filteredImu <= 2500;
  const headingTelemetryFresh = topicHeartbeat.heading && Date.now() - topicHeartbeat.heading <= 2500;
  const diagnosticsTelemetryFresh = topicHeartbeat.diagnostics && Date.now() - topicHeartbeat.diagnostics <= 2500;
  const displayedWheelDiag = staleTelemetry || !jointTelemetryFresh ? { fl: { velocity: 0, current: 0 }, fr: { velocity: 0, current: 0 }, rl: { velocity: 0, current: 0 }, rr: { velocity: 0, current: 0 } } : wheelDiag;
  const displayedSteerDiag = staleTelemetry || !jointTelemetryFresh ? { fl: { orientationDeg: 0, current: 0 }, fr: { orientationDeg: 0, current: 0 }, rl: { orientationDeg: 0, current: 0 }, rr: { orientationDeg: 0, current: 0 } } : steerDiag;
  const displayedVelocityMps = staleTelemetry || !odomTelemetryFresh ? 0 : roverVelocityMps;
  const displayedHeadingDeg = staleTelemetry || !headingTelemetryFresh ? null : headingDeg;
  const displayedTilt = staleTelemetry || !imuTelemetryFresh ? { rollDeg: 0, pitchDeg: 0, magnitudeDeg: 0, vectorLabel: "CENTERED" } : tilt;
  const displayedImuDynamics = staleTelemetry || !imuTelemetryFresh ? { yawRateDegs: 0, accelMagnitude: 0, accelState: "STEADY" } : imuDynamics;
  const displayedDiagnosticsSummary = staleTelemetry || !diagnosticsTelemetryFresh ? { ok: 0, warn: 0, error: 0, stale: 0, topIssue: `Waiting for ${TECHNICIAN_TOPICS.diagnostics.name}` } : diagnosticsSummary;
  const displayedDiagnosticItems = staleTelemetry || !diagnosticsTelemetryFresh ? [] : diagnosticItems;
  const tiltWarning = displayedTilt.magnitudeDeg > 12;
  const safetyPercent = Math.max(0, Math.min(100, (displayedTilt.magnitudeDeg / 15) * 100));
  const headingLabel = displayedHeadingDeg == null ? "UNKNOWN" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((displayedHeadingDeg % 360) + 360) % 360) / 45) % 8];
  const avgWheelVelocity = Object.values(displayedWheelDiag).reduce((sum, wheel) => sum + Math.abs(wheel.velocity), 0) / 4;
  const steerSpreadDeg = Math.max(...Object.values(displayedSteerDiag).map((steer) => steer.orientationDeg)) - Math.min(...Object.values(displayedSteerDiag).map((steer) => steer.orientationDeg));
  const wheelImbalanceDeg = Math.max(...Object.values(displayedWheelDiag).map((wheel) => Math.abs(wheel.velocity))) - Math.min(...Object.values(displayedWheelDiag).map((wheel) => Math.abs(wheel.velocity)));
  const frontSteerMismatchDeg = Math.abs(displayedSteerDiag.fl.orientationDeg - displayedSteerDiag.fr.orientationDeg);
  const rearSteerMismatchDeg = Math.abs(displayedSteerDiag.rl.orientationDeg - displayedSteerDiag.rr.orientationDeg);
  const motionState = displayedVelocityMps < 0.05 ? "STOPPED" : Math.abs(motionStats.yawRateDps) > 8 ? "TURNING" : "TRACKING";
  const estimatedTurnRadiusM = Math.abs(motionStats.yawRateDps) < 0.5 ? null : displayedVelocityMps / Math.max(0.01, Math.abs(motionStats.yawRateDps) * (Math.PI / 180));
  const mobilityTrackingState = wheelImbalanceDeg > 1.5 || frontSteerMismatchDeg > 8 || rearSteerMismatchDeg > 8 ? "ASYMMETRIC" : "BALANCED";
  const wheelFault = Object.values(wheelDiag).some((wheel) => Math.abs(wheel.current) > 18);
  const stalestTelemetry = telemetryTopicStates.reduce((worst, item) => {
    if (item.ageMs == null) return worst;
    if (worst == null || item.ageMs > worst.ageMs) return item;
    return worst;
  }, null);
  const canConnections = [
    { name: "CAN0 Main Bus", percent: rosStatus === "connected" ? 97 : rosStatus === "connecting..." ? 52 : 8, detail: rosStatus === "connected" ? "Heartbeat active" : "ROS bridge not fully established" },
    { name: "CAN1 Arm Bus", percent: Math.max(0, Math.min(100, Math.round(radioLevel))), detail: "Radio topic not published in sim; using fallback display" },
    { name: "CAN2 Mobility Bus", percent: Math.max(10, Math.min(100, Math.round((bytesPerSecond / 1400) * 100))), detail: `Telemetry rate ${bytesPerSecond.toFixed(0)} B/s` },
    { name: "CAN3 Instrument Bus", percent: 61, detail: "Science instrument link initialized" },
    { name: "CAN4 Aux Bus", percent: 89, detail: "Aux power and lighting nominal" },
  ];
  const systemChecks = [
    { name: "ROS Link", ok: rosStatus === "connected" },
    { name: "Power Bus", ok: driveBattery.packVoltageV > 22.2 && armBattery.packVoltageV > 22.2 },
    { name: "Thermal", ok: Object.values(sensorTemps).every((t) => t < 75) },
    { name: "Mobility Motors", ok: Object.values(motorEnabled).some(Boolean) },
    { name: "Diagnostics", ok: !topicAvailability.diagnostics || (diagnosticsSummary.error === 0 && diagnosticsSummary.stale === 0) },
    { name: "Telemetry Freshness", ok: freshTelemetryCount >= 4 },
    { name: "Safety Envelope", ok: !tiltWarning },
  ];

  return (
    <div style={{ height: "100%", minHeight: "100%", padding: "10px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "auto", gridAutoRows: "max-content", gap: "10px", alignItems: "stretch" }}>
      <MissionClock
        hours={hours}
        minutes={minutes}
        seconds={seconds}
        inputHours={inputHours}
        inputMinutes={inputMinutes}
        inputSeconds={inputSeconds}
        setInputHours={setInputHours}
        setInputMinutes={setInputMinutes}
        setInputSeconds={setInputSeconds}
        remainingSeconds={remainingSeconds}
        setTimerRunning={setTimerRunning}
        configuredSeconds={configuredSeconds}
        setRemainingSeconds={setRemainingSeconds}
        applyTimer={applyTimer}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px", alignItems: "stretch" }}>
        <PowerPanel
          driveBattery={driveBattery}
          armBattery={armBattery}
          sensorTemps={sensorTemps}
        />

        <CommsPanel
          rosStatus={rosStatus}
          ledState={ledState}
          setLedState={setLedState}
          radioLevel={radioLevel}
          bytesPerSecond={bytesPerSecond}
          freshTelemetryCount={freshTelemetryCount}
          telemetryTopicStates={telemetryTopicStates}
          stalestTelemetry={stalestTelemetry}
          displayedVelocityMps={displayedVelocityMps}
          displayedHeadingDeg={displayedHeadingDeg}
          headingLabel={headingLabel}
          motionState={motionState}
          motionStats={motionStats}
          estimatedTurnRadiusM={estimatedTurnRadiusM}
          displayedDiagnosticsSummary={displayedDiagnosticsSummary}
          diagnosticsTelemetryFresh={diagnosticsTelemetryFresh}
          topicAvailability={topicAvailability}
          laserWarningOn={laserWarningOn}
          setLaserWarningOn={setLaserWarningOn}
          wheelFault={wheelFault}
          systemChecks={systemChecks}
          showCanPopup={showCanPopup}
          setShowCanPopup={setShowCanPopup}
          canConnections={canConnections}
        />
      </div>

      <MobilityPanel
        avgWheelVelocity={avgWheelVelocity}
        steerSpreadDeg={steerSpreadDeg}
        wheelImbalanceDeg={wheelImbalanceDeg}
        frontSteerMismatchDeg={frontSteerMismatchDeg}
        rearSteerMismatchDeg={rearSteerMismatchDeg}
        mobilityTrackingState={mobilityTrackingState}
        displayedWheelDiag={displayedWheelDiag}
        displayedSteerDiag={displayedSteerDiag}
        motorEnabled={motorEnabled}
        setMotorEnabled={setMotorEnabled}
        sendHardMotorStop={sendHardMotorStop}
        motorCommandStatus={motorCommandStatus}
        displayedTilt={displayedTilt}
        displayedImuDynamics={displayedImuDynamics}
        tiltWarning={tiltWarning}
        safetyPercent={safetyPercent}
      />

      <DiagnosticsPanel
        topicAvailability={topicAvailability}
        displayedDiagnosticsSummary={displayedDiagnosticsSummary}
        displayedDiagnosticItems={displayedDiagnosticItems}
        ledState={ledState}
        setLedState={setLedState}
        laserWarningOn={laserWarningOn}
        setLaserWarningOn={setLaserWarningOn}
        wheelFault={wheelFault}
        systemChecks={systemChecks}
      />
    </div>
  );
}
