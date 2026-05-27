"use client";

import React, { useRef, useEffect } from "react";

// Euclidean distance in meters (flat-earth, good enough for <10 km)
export function euclideanMeters(pos1, pos2) {
  const R = 6371000;
  const dLat = (pos2.latitude - pos1.latitude) * (Math.PI / 180) * R;
  const dLon = (pos2.longitude - pos1.longitude) * (Math.PI / 180) * R * Math.cos(pos1.latitude * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function draw(canvas, roverHeading, roverPosition, nextWaypoint) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.44;

  ctx.clearRect(0, 0, W, H);

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner range ring
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  ctx.stroke();

  // North indicator — rotates based on rover heading to show where North is relative to rover forward
  if (roverHeading !== null && roverHeading !== undefined) {
    // bearing to North (π/2 in ROS East-CCW) relative to rover forward
    const northRelative = Math.PI / 2 - roverHeading;
    // canvas: 0=right CW, up=-π/2; robot faces up → waypoint at canvasAngle = -π/2 - relativeAngle
    const northCanvasAngle = -Math.PI / 2 - northRelative;
    const nr = R * 0.82;
    const nx = cx + Math.cos(northCanvasAngle) * nr;
    const ny = cy + Math.sin(northCanvasAngle) * nr;
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", nx, ny);
  }

  // Dotted line + arrowhead to next waypoint
  if (nextWaypoint && roverPosition && roverHeading !== null && roverHeading !== undefined) {
    // bearing in ROS convention (0=East, CCW, radians)
    const bearing = Math.atan2(
      nextWaypoint.latitude - roverPosition.latitude,
      nextWaypoint.longitude - roverPosition.longitude
    );
    const relativeAngle = bearing - roverHeading;
    const canvasAngle = -Math.PI / 2 - relativeAngle;
    const lineLen = R * 0.68;

    const endX = cx + Math.cos(canvasAngle) * lineLen;
    const endY = cy + Math.sin(canvasAngle) * lineLen;

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Arrowhead
    const arrowLen = 9;
    const spread = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - arrowLen * Math.cos(canvasAngle - spread), endY - arrowLen * Math.sin(canvasAngle - spread));
    ctx.lineTo(endX - arrowLen * Math.cos(canvasAngle + spread), endY - arrowLen * Math.sin(canvasAngle + spread));
    ctx.closePath();
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  }

  // Robot triangle at center, always pointing up
  const triH = 13;
  const triW = 9;
  ctx.beginPath();
  ctx.moveTo(cx, cy - triH);
  ctx.lineTo(cx - triW, cy + triH * 0.5);
  ctx.lineTo(cx, cy + triH * 0.2);
  ctx.lineTo(cx + triW, cy + triH * 0.5);
  ctx.closePath();
  ctx.fillStyle = "#22c55e";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "FWD" label above robot
  ctx.font = "7px sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("FWD", cx, cy - triH - 2);
}

export default function MiniMapHUD({ roverHeading, roverPosition, nextWaypoint, size = 180 }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, roverHeading, roverPosition, nextWaypoint);
  }, [roverHeading, roverPosition, nextWaypoint]);

  const noData = roverHeading === null || roverHeading === undefined;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: "50%", display: "block" }} />
      {noData && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%", background: "rgba(17,24,39,0.75)", color: "#6b7280", fontSize: "11px", textAlign: "center",
        }}>
          No heading
        </div>
      )}
    </div>
  );
}
