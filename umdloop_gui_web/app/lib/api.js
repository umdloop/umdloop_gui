import { getApiBaseUrl } from "../config";

const base = () => getApiBaseUrl();

export async function getObjectDetectionStatus() {
  const res = await fetch(`${base()}/object-detection/status`);
  return res.json();
}

export async function startObjectDetection() {
  const res = await fetch(`${base()}/object-detection/start`, { method: "POST" });
  return res.json();
}

export async function stopObjectDetection() {
  const res = await fetch(`${base()}/object-detection/stop`, { method: "POST" });
  return res.json();
}

export async function sendPathPlan({ latitude, longitude, positionTolerance = 0.0, mode = "GNSS" }) {
  const res = await fetch(`${base()}/navigation/path-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude,
      longitude,
      position_tolerance: positionTolerance,
      mode,
    }),
  });
  return res.json();
}

export async function getRoverPosition() {
  const res = await fetch(`${base()}/navigation/rover-position`);
  return res.json();
}

export async function getRadioStatus() {
  const res = await fetch(`${base()}/radio/status`);
  return res.json();
}

export async function sendRosCommand(command) {
  const res = await fetch(`${base()}/ros/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  return res.json();
}
