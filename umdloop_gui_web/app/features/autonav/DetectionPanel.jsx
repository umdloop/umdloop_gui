"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { useWebRTC } from "../../context/WebRTCContext";
import { isStoppedAfterArrival, yoloSourceDims } from "./missionConstants";

const STORAGE_KEY = "autonav-detection-camera";

// Detection2D bbox → normalized [0,1] box {cx, cy, w, h} using YOLO source dims.
function normalizeBox(det, srcW, srcH) {
  const bbox = det?.bbox;
  if (!bbox) return null;
  // vision_msgs/BoundingBox2D: center is a Pose2D ({position:{x,y}} in Humble+,
  // or {x,y} in older builds), with size_x / size_y in source pixels.
  const center = bbox.center?.position ?? bbox.center ?? {};
  const cx = center.x;
  const cy = center.y;
  if (cx === undefined || cy === undefined || !bbox.size_x || !bbox.size_y) return null;
  return { cx: cx / srcW, cy: cy / srcH, w: bbox.size_x / srcW, h: bbox.size_y / srcH };
}

function detScore(det) {
  return det?.results?.[0]?.hypothesis?.score ?? 0;
}
function detLabel(det) {
  return det?.results?.[0]?.hypothesis?.class_id ?? "";
}

// Pick the single designated detection: match the node's target label + center,
// else fall back to the top-score box. Exactly one box → "only 1 highlighted".
function pickDesignated(detections, targetLabel, targetCenter) {
  if (!detections || detections.length === 0) return null;
  if (targetLabel) {
    const byLabel = detections.filter((d) => detLabel(d) === targetLabel);
    if (byLabel.length === 1) return byLabel[0];
    if (byLabel.length > 1 && targetCenter) {
      // Disambiguate by nearest center to /yolo/target_center.
      return byLabel.reduce((best, d) => {
        const c = d.bbox?.center?.position ?? d.bbox?.center ?? {};
        const dist = (c.x - targetCenter.x) ** 2 + (c.y - targetCenter.y) ** 2;
        return !best || dist < best.dist ? { d, dist } : best;
      }, null)?.d;
    }
    if (byLabel.length >= 1) return byLabel[0];
  }
  return detections.reduce((best, d) => (detScore(d) > detScore(best) ? d : best), detections[0]);
}

export default function DetectionPanel({
  yoloDetections = [],
  yoloFound = false,
  yoloLabel = "",
  yoloCenter = null,
  camInfo = null,
  navState = null,
}) {
  const { cameras } = useWebRTC();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraId, setCameraId] = useState(null);

  // Restore the saved camera once the camera list arrives; default to a
  // ZED-like camera if present, else the first available.
  useEffect(() => {
    if (cameraId != null || cameras.length === 0) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved && cameras.some((c) => c.id === saved)) {
      setCameraId(saved);
      return;
    }
    const zed = cameras.find((c) => /zed/i.test(`${c.name} ${c.role || ""}`));
    setCameraId((zed || cameras[0]).id);
  }, [cameras, cameraId]);

  const onSelectCamera = (id) => {
    setCameraId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  const { w: srcW, h: srcH } = useMemo(() => yoloSourceDims(camInfo), [camInfo]);

  const designated = useMemo(
    () => pickDesignated(yoloDetections, yoloLabel, yoloCenter),
    [yoloDetections, yoloLabel, yoloCenter]
  );

  // Gate per rule 1.f.v: highlight the designated object only when the target is
  // found and the rover is stopped (one at a time, stopped). If we have no
  // nav state yet, still show it so the operator isn't blind.
  const gated = yoloFound && (navState == null || isStoppedAfterArrival(navState));
  const showBox = gated && designated != null;

  const score = designated ? detScore(designated) : 0;
  const labelText = designated ? detLabel(designated) || yoloLabel : yoloLabel;

  // ── Draw the single bbox, letterbox-corrected to the displayed video rect. ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const draw = () => {
      const video = container.querySelector("video");
      const rect = container.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, cw, ch);

      if (!showBox || !video) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const box = normalizeBox(designated, srcW, srcH);
      if (!box) return;

      // object-fit: contain letterbox math — map the source frame into the
      // displayed rect, then place the normalized box inside that.
      const videoAR = vw / vh;
      const boxAR = cw / ch;
      let dispW;
      let dispH;
      if (videoAR > boxAR) {
        dispW = cw;
        dispH = cw / videoAR;
      } else {
        dispH = ch;
        dispW = ch * videoAR;
      }
      const offX = (cw - dispW) / 2;
      const offY = (ch - dispH) / 2;

      const x = offX + (box.cx - box.w / 2) * dispW;
      const y = offY + (box.cy - box.h / 2) * dispH;
      const bw = box.w * dispW;
      const bh = box.h * dispH;

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#22ff88";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.strokeRect(x, y, bw, bh);

      // Corner accents for visibility.
      ctx.shadowBlur = 0;
      const tag = `${labelText || "target"} ${(score * 100).toFixed(0)}%`;
      ctx.font = "bold 14px sans-serif";
      const tw = ctx.measureText(tag).width + 12;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(x, Math.max(0, y - 22), tw, 20);
      ctx.fillStyle = "#22ff88";
      ctx.fillText(tag, x + 6, Math.max(14, y - 7));
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    // The video may report videoWidth/Height a little after the stream starts;
    // a light poll keeps the box aligned until metadata + frames settle.
    const id = window.setInterval(draw, 250);
    return () => {
      ro.disconnect();
      window.clearInterval(id);
    };
  }, [showBox, designated, srcW, srcH, labelText, score]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#161616" }}>
      {/* Header: camera selector + recognition badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#2d2d2d", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Detection</span>
        <select
          value={cameraId ?? ""}
          onChange={(e) => onSelectCamera(e.target.value)}
          style={{ background: "#3d3d3d", color: "white", border: "1px solid #555", borderRadius: 4, padding: "3px 6px", fontSize: 12 }}
        >
          {cameras.length === 0 && <option value="">No cameras</option>}
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.role ? ` (${c.role})` : ""}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          {showBox ? (
            <span style={{ background: "#064e2b", color: "#22ff88", padding: "4px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 800, border: "1px solid #22ff88" }}>
              RECOGNIZED: {labelText || "target"} {(score * 100).toFixed(0)}%
            </span>
          ) : yoloFound ? (
            <span style={{ color: "#fcd34d", fontSize: 12, fontWeight: 700 }}>target found — awaiting stop</span>
          ) : (
            <span style={{ color: "#777", fontSize: 12, fontWeight: 700 }}>searching…</span>
          )}
        </div>
      </div>

      {/* Camera feed + bbox overlay */}
      <div ref={containerRef} style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <CameraFeed cameraId={cameraId} label="ZED / Detection" style={{ width: "100%", height: "100%", borderRadius: 0 }} />
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}
