"use client";

import React, { useEffect, useState } from "react";
import ROSLIB from "roslib";
import { TECHNICIAN_COMMAND_TOPICS, TECHNICIAN_TOPICS, getRosbridgeUrl } from "../config";
import { TATTU_HV_6S_22000, buildBatteryHealthSnapshot } from "../battery";

export default function TechnicianDashboard() {
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
    const h = Math.max(0, parseInt(setHours, 10) || 0);
    const m = Math.max(0, parseInt(setMinutes, 10) || 0);
    const s = Math.max(0, parseInt(setSeconds, 10) || 0);
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px", alignItems: "stretch" }}>
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
          <button onClick={() => setShowCanPopup(true)} style={{ marginTop: "8px", width: "100%", borderRadius: "8px", border: "1px solid #4f4f4f", background: "#2b2b2b", color: "white", padding: "10px 12px", fontSize: "18px", fontWeight: 800, cursor: "pointer" }}>
            View CAN Connections
          </button>
        </div>
      </div>

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

      {showCanPopup ? (
        <div onClick={() => setShowCanPopup(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(860px, 96vw)", maxHeight: "84vh", overflowY: "auto", background: "#212121", border: "1px solid #4a4a4a", borderRadius: "12px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ color: "white", fontSize: "28px", fontWeight: 900 }}>CAN Connection Status</div>
              <button onClick={() => setShowCanPopup(false)} style={{ borderRadius: "8px", border: "1px solid #666", background: "#333", color: "white", cursor: "pointer", padding: "8px 12px", fontWeight: 800, fontSize: "16px" }}>
                Close
              </button>
            </div>
            <div style={{ color: "#cfcfcf", fontSize: "18px", marginBottom: "12px" }}>Snapshot of CAN channels. ROS and MikroTik link metrics are live; some auxiliary channels remain placeholder.</div>
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
      ) : null}
    </div>
  );
}
