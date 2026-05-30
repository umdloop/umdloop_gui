"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import { getApiBaseUrl, getRosbridgeUrl } from "../../config";
import { sendActionGoal } from "../../lib/rosbridgeAction";
import { ACTION, GOAL_SOURCE, SERVICES, TOPICS } from "./missionConstants";

/**
 * Single rosbridge connection + Flask GPS poll for the Autonomous Navigation
 * Mission. Subscribes to the mission_executive topics, exposes the latest
 * state, and wraps the services + navigate_to_target action as commands.
 *
 * Registration contract (see plan §4): "Go" sends the action by `target_id`
 * only — the node uses the stored type/tolerance, so always `setTarget` first,
 * then `navigateTo(id)`.
 */
export default function useMissionExecutive() {
  const [status, setStatus] = useState("connecting...");
  const [navStatus, setNavStatus] = useState(null);
  const [led, setLed] = useState(null);
  const [navEnabled, setNavEnabled] = useState(null);
  const [queue, setQueue] = useState([]);
  const [roverPosition, setRoverPosition] = useState(null);
  const [roverStatus, setRoverStatus] = useState("no fix");
  const [roverHeading, setRoverHeading] = useState(null);
  const [yoloFound, setYoloFound] = useState(false);
  const [yoloLabel, setYoloLabel] = useState("");
  const [yoloCenter, setYoloCenter] = useState(null);
  const [yoloDetections, setYoloDetections] = useState([]);
  const [camInfo, setCamInfo] = useState(null);
  const [goalActive, setGoalActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const rosRef = useRef(null);
  const goalRef = useRef(null);
  const navStatusRef = useRef(null);

  useEffect(() => {
    navStatusRef.current = navStatus;
  }, [navStatus]);

  // ── Connection + subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    rosRef.current = ros;

    ros.on("connection", () => setStatus("connected"));
    ros.on("error", () => setStatus("error"));
    ros.on("close", () => setStatus("disconnected"));

    const subs = [];
    const sub = (topicCfg, cb) => {
      const topic = new ROSLIB.Topic({ ros, name: topicCfg.name, messageType: topicCfg.type });
      topic.subscribe(cb);
      subs.push(topic);
    };

    sub(TOPICS.navStatus, (m) => setNavStatus(m));
    sub(TOPICS.ledStatus, (m) => setLed(m));
    sub(TOPICS.navEnabled, (m) => setNavEnabled(!!m?.data));
    sub(TOPICS.waypointQueue, (m) => {
      try {
        const parsed = JSON.parse(m?.data ?? "[]");
        if (Array.isArray(parsed)) setQueue(parsed);
      } catch {
        /* malformed frame — keep last good queue */
      }
    });
    sub(TOPICS.heading, (m) => {
      if (m?.heading !== undefined) setRoverHeading(m.heading);
    });
    sub(TOPICS.yoloFound, (m) => setYoloFound(!!m?.data));
    sub(TOPICS.yoloLabel, (m) => setYoloLabel(m?.data || ""));
    sub(TOPICS.yoloCenter, (m) =>
      setYoloCenter(m?.point ? { x: m.point.x, y: m.point.y } : null)
    );
    sub(TOPICS.yoloDetections, (m) =>
      setYoloDetections(Array.isArray(m?.detections) ? m.detections : [])
    );
    sub(TOPICS.camInfo, (m) => {
      if (m?.width && m?.height) setCamInfo({ width: m.width, height: m.height });
    });

    return () => {
      subs.forEach((t) => t.unsubscribe());
      if (goalRef.current) {
        try {
          goalRef.current.cancel();
        } catch {
          /* ignore */
        }
        goalRef.current = null;
      }
      rosRef.current = null;
      ros.close();
    };
  }, []);

  // ── Rover GPS poll (1 Hz) — /gps/fix is best-effort, won't arrive reliably
  // over a roslib sub, so we use the Flask passthrough. ──────────────────────
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/navigation/rover-position`);
        const data = await res.json();
        if (cancelled) return;
        if (data.fix) {
          setRoverPosition({ latitude: data.latitude, longitude: data.longitude });
          setRoverStatus("fix");
        } else {
          setRoverStatus("no fix");
        }
      } catch {
        if (!cancelled) setRoverStatus("unreachable");
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ── Commands ───────────────────────────────────────────────────────────────
  const callService = useCallback(
    (svc, request) =>
      new Promise((resolve, reject) => {
        const ros = rosRef.current;
        if (!ros) {
          reject(new Error("Not connected to rosbridge"));
          return;
        }
        const service = new ROSLIB.Service({ ros, name: svc.name, serviceType: svc.type });
        service.callService(new ROSLIB.ServiceRequest(request), resolve, reject);
      }),
    []
  );

  const setTarget = useCallback(
    (t) =>
      callService(SERVICES.setTarget, {
        target_id: t.id,
        goal_type: GOAL_SOURCE.GPS,
        lat: t.lat,
        lon: t.lon,
        x_m: 0,
        y_m: 0,
        target_type: t.type,
        tolerance_m: t.tol,
      }),
    [callService]
  );

  const skip = useCallback(() => callService(SERVICES.skip, {}), [callService]);

  const cancelGoal = useCallback(() => {
    if (goalRef.current) {
      try {
        goalRef.current.cancel();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const abort = useCallback(() => {
    cancelGoal();
    return callService(SERVICES.abort, {});
  }, [callService, cancelGoal]);

  const teleop = useCallback((on) => callService(SERVICES.teleop, { data: !!on }), [callService]);

  // Go / Return: send the action by target_id only. The node reads the stored
  // type/tolerance for that id; the remaining goal fields are ignored.
  const navigateTo = useCallback((targetId, isReturn = false) => {
    const ros = rosRef.current;
    if (!ros) return null;
    if (goalRef.current) {
      try {
        goalRef.current.cancel();
      } catch {
        /* ignore */
      }
      goalRef.current = null;
    }
    setLastResult(null);
    setGoalActive(true);

    const goal = sendActionGoal(ros, {
      action: ACTION.name,
      actionType: ACTION.type,
      args: {
        target_id: targetId,
        goal_type: GOAL_SOURCE.GPS,
        lat: 0,
        lon: 0,
        x_m: 0,
        y_m: 0,
        target_type: 0,
        tolerance_m: 0,
        is_return: !!isReturn,
      },
      onResult: (outcome) => {
        const values = outcome.values || {};
        goalRef.current = null;
        setGoalActive(false);
        setLastResult({
          success: !!values.success,
          message: values.message || "",
          state: navStatusRef.current?.state || "",
        });
      },
    });
    goalRef.current = goal;
    return goal;
  }, []);

  const clearLastResult = useCallback(() => setLastResult(null), []);

  return {
    status,
    navStatus,
    led,
    navEnabled,
    queue,
    roverPosition,
    roverStatus,
    roverHeading,
    yoloFound,
    yoloLabel,
    yoloCenter,
    yoloDetections,
    camInfo,
    goalActive,
    lastResult,
    setTarget,
    skip,
    abort,
    teleop,
    navigateTo,
    cancelGoal,
    clearLastResult,
  };
}
