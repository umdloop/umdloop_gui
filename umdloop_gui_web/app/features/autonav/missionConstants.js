"use client";

// Names, enums, and small pure helpers for the Autonomous Navigation Mission
// (URC rule 1.f). Verified against mission_executive_node.cpp, the msgs defs,
// and yolo_ros_node.py.

// Node namespace — default matches the mission_executive node name. All YOLO
// topic names are env-overridable for field rewiring.
export const MISSION_NS = process.env.NEXT_PUBLIC_MISSION_NS || "/mission_executive";

export const SERVICES = {
  setTarget: { name: `${MISSION_NS}/set_target`, type: "msgs/srv/SetTarget" },
  skip: { name: `${MISSION_NS}/skip`, type: "std_srvs/srv/Trigger" },
  abort: { name: `${MISSION_NS}/abort`, type: "std_srvs/srv/Trigger" },
  teleop: { name: `${MISSION_NS}/teleop`, type: "std_srvs/srv/SetBool" },
};

export const ACTION = {
  name: `${MISSION_NS}/navigate_to_target`,
  type: "msgs/action/NavigateToTarget",
};

export const TOPICS = {
  navStatus: { name: "/nav_status", type: "msgs/msg/NavStatus" },
  ledStatus: { name: "/led_status", type: "msgs/msg/LedStatus" },
  navEnabled: { name: "/nav_enabled", type: "std_msgs/msg/Bool" },
  waypointQueue: { name: "/waypoint_queue", type: "std_msgs/msg/String" },
  heading: { name: "/heading", type: "msgs/msg/Heading" },
  yoloFound: {
    name: process.env.NEXT_PUBLIC_YOLO_FOUND_TOPIC || "/yolo/target_found",
    type: "std_msgs/msg/Bool",
  },
  yoloLabel: {
    name: process.env.NEXT_PUBLIC_YOLO_LABEL_TOPIC || "/yolo/target_label",
    type: "std_msgs/msg/String",
  },
  yoloCenter: {
    name: process.env.NEXT_PUBLIC_YOLO_CENTER_TOPIC || "/yolo/target_center",
    type: "geometry_msgs/msg/PointStamped",
  },
  yoloDetections: {
    name: process.env.NEXT_PUBLIC_YOLO_DETECTIONS_TOPIC || "/yolo/detections",
    type: "vision_msgs/msg/Detection2DArray",
  },
  camInfo: {
    name: process.env.NEXT_PUBLIC_YOLO_CAMINFO_TOPIC || "/zed/zed_node/rgb/camera_info",
    type: "sensor_msgs/msg/CameraInfo",
  },
};

// Target type enum — from SetTarget.srv / NavigateToTarget.action. NEVER read
// type from /active_target; its enum differs and the node doesn't remap.
export const TARGET_TYPE = {
  GNSS_ONLY: 0,
  ARUCO_POST_1: 1,
  ARUCO_POST_2: 2,
  OBJECT: 3,
};

export const GOAL_SOURCE = { GPS: 0, METER: 1 };

// tol defaults: GNSS 3 m (1.f.iii), Post1 13 / Post2 23 m GPS-vicinity (final
// 2 m is camera-driven in the node, 1.f.iv), Object 3 m.
export const TARGET_TYPE_LIST = [
  { value: TARGET_TYPE.GNSS_ONLY, key: "GNSS_ONLY", label: "GNSS", tol: 3, color: "#3b82f6" },
  { value: TARGET_TYPE.ARUCO_POST_1, key: "ARUCO_POST_1", label: "Post 1", tol: 13, color: "#f59e0b" },
  { value: TARGET_TYPE.ARUCO_POST_2, key: "ARUCO_POST_2", label: "Post 2", tol: 23, color: "#a855f7" },
  { value: TARGET_TYPE.OBJECT, key: "OBJECT", label: "Object", tol: 3, color: "#10b981" },
];

export function targetTypeMeta(value) {
  return TARGET_TYPE_LIST.find((t) => t.value === Number(value)) || TARGET_TYPE_LIST[0];
}

// /waypoint_queue status values, from publishWaypointQueue().
export const STATUS_COLORS = {
  PENDING: "#9ca3af",
  ACTIVE: "#3b82f6",
  VISITED: "#22c55e",
  SKIPPED: "#6b7280",
};

// ── Mission state classification (NavStatus.state strings) ───────────────────
const NAVIGATING_STATES = new Set([
  "NAVIGATING",
  "ARUCO_CONFIRM",
  "ARUCO_APPROACH",
  "ARRIVING",
  "RETURNING",
  "SPIRAL_COVERAGE",
  "ABORTING",
]);

// States where the rover is stopped after an arrival/search — "no driving while
// stopped-after-arrival" (1.f.ix). These also drive flashing-green LED.
const STOPPED_AFTER_ARRIVAL_STATES = new Set([
  "STOPPED_AT_TARGET",
  "STOPPED_AT_RETURN",
  "SPIRAL_DONE",
]);

export function isNavigating(state) {
  return NAVIGATING_STATES.has(state);
}

export function isStoppedAfterArrival(state) {
  return STOPPED_AFTER_ARRIVAL_STATES.has(state);
}

// ── LED mirror (1.f.vi) ──────────────────────────────────────────────────────
// LedStatus: cmd CMD_SOLID=1, CMD_FLASH=2, CMD_PULSE=3, CMD_OFF=255.
export function ledLabel(led) {
  if (!led || led.cmd === undefined || led.cmd === 255) {
    return { label: "OFF", color: "#3a3a3a", flashing: false };
  }
  const r = led.r ?? 0;
  const g = led.g ?? 0;
  const b = led.b ?? 0;
  const flashing = led.cmd === 2;
  const color = `rgb(${r}, ${g}, ${b})`;
  let label;
  if (r > 200 && g < 80 && b < 80) label = "RED · Autonomous";
  else if (b > 200 && r < 80 && g < 80) label = "BLUE · Teleop";
  else if (g > 200 && r < 80 && b < 80) label = flashing ? "FLASHING GREEN · Arrived" : "GREEN";
  else label = `RGB(${r}, ${g}, ${b})`;
  return { label, color, flashing };
}

// ── Arrival banner (1.f.vii) ─────────────────────────────────────────────────
// Driven by the action result. SUCCESS only on result.success; FAILED-SEARCH on
// a failed spiral (e.g. ArUco tag not found) — never a green "arrived" on a
// failed spiral.
export function arrivalBanner(navStatus, lastResult) {
  if (!lastResult) return { kind: null };
  const message = lastResult.message || "";
  if (lastResult.success) {
    return { kind: "success", title: "TARGET REACHED", detail: message || "Arrived at target." };
  }
  const failedSearch =
    lastResult.state === "SPIRAL_DONE" || /not found|spiral|search/i.test(message);
  if (failedSearch) {
    return { kind: "failed", title: "SEARCH FAILED", detail: message || "Target not found." };
  }
  // Aborted / cancelled — no celebratory or failure banner.
  return { kind: null };
}

// ── YOLO source dimensions (4a) ──────────────────────────────────────────────
// Normalize bbox using the YOLO source image size — CameraInfo if available,
// else env fallback dims.
export function yoloSourceDims(camInfo) {
  if (camInfo?.width && camInfo?.height) {
    return { w: camInfo.width, h: camInfo.height };
  }
  const w = Number(process.env.NEXT_PUBLIC_YOLO_IMG_W) || 1280;
  const h = Number(process.env.NEXT_PUBLIC_YOLO_IMG_H) || 720;
  return { w, h };
}

// ── Geo helpers ──────────────────────────────────────────────────────────────
const EARTH_R = 6371000; // m

export function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// A GeoJSON polygon approximating a circle of `radiusM` around [lon, lat],
// for drawing the arrival tolerance ring on the map.
export function circlePolygon(lon, lat, radiusM, steps = 64) {
  const coords = [];
  const latRad = (lat * Math.PI) / 180;
  const dLat = (radiusM / EARTH_R) * (180 / Math.PI);
  const dLon = dLat / Math.cos(latRad);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } };
}

// ── Mission limits (1.f.i) ───────────────────────────────────────────────────
export const TIME_LIMIT_MS = 30 * 60 * 1000; // 30 min
export const TIME_AMBER_MS = 25 * 60 * 1000;
export const DIST_LIMIT_M = 2000; // 2 km
export const DIST_AMBER_M = 1600;

export function limitColor(value, amber, limit) {
  if (value >= limit) return "#ef4444";
  if (value >= amber) return "#f59e0b";
  return "#d8d8d8";
}
