"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../../context/WebRTCContext";

const OVERLAY_STYLE = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#111",
  color: "#888",
  fontSize: 12,
  fontWeight: 700,
  gap: 6,
  borderRadius: "inherit",
};

/**
 * Computes the on-screen rectangle (in container pixels) of a normalized
 * [0,1] bounding box, accounting for the letterboxing produced by the
 * video's `objectFit: contain`. Returns null until both sizes are known.
 */
function boxToPixels(box, video, container) {
  if (!box || !video || !container) return null;
  const { w: vw, h: vh } = video;
  const { w: cw, h: ch } = container;
  if (!vw || !vh || !cw || !ch) return null;

  const scale = Math.min(cw / vw, ch / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offX = (cw - dispW) / 2;
  const offY = (ch - dispH) / 2;

  return {
    left: offX + (box.nx - box.nw / 2) * dispW,
    top: offY + (box.ny - box.nh / 2) * dispH,
    width: box.nw * dispW,
    height: box.nh * dispH,
  };
}

export default function CameraFeed({
  role,
  cameraId,
  label,
  style,
  rotateDeg = 0,
  onClick,
  height,
  passive = false,
  detection = null,
  highlighted = false,
}) {
  const { connected, cameras, streams, enableCamera, disableCamera } = useWebRTC();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [videoSize, setVideoSize] = useState(null);
  const [containerSize, setContainerSize] = useState(null);

  const camera = cameraId != null
    ? cameras.find((c) => c.id === String(cameraId))
    : cameras.find((c) => c.role === role);
  const stream = camera ? streams[camera.id] : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!camera || passive) return;
    const id = camera.id;
    enableCamera(id);
    return () => disableCamera(id);
  }, [camera?.id, passive, enableCamera, disableCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Track container size for the bbox transform.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const containerStyle = {
    position: "relative",
    background: "#111",
    borderRadius: 10,
    overflow: "hidden",
    cursor: onClick ? "pointer" : undefined,
    ...(height != null ? { height } : {}),
    ...style,
    ...(highlighted
      ? { outline: "3px solid #4ade80", outlineOffset: -3, boxShadow: "0 0 18px rgba(74,222,128,0.7)" }
      : {}),
  };

  let overlay = null;
  if (!connected) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Connecting...</span></div>;
  } else if (!camera) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Unassigned — open Camera Manager</span></div>;
  } else if (!stream) {
    overlay = <div style={OVERLAY_STYLE}><span>{label}</span><span style={{ color: "#555" }}>Starting stream...</span></div>;
  }

  const boxRect = detection ? boxToPixels(detection.box, videoSize, containerSize) : null;

  return (
    <div ref={containerRef} style={containerStyle} onClick={onClick}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => setVideoSize({ w: e.target.videoWidth, h: e.target.videoHeight })}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
            transformOrigin: "center center",
          }}
        />
      )}

      {boxRect && (
        <div
          style={{
            position: "absolute",
            left: boxRect.left,
            top: boxRect.top,
            width: boxRect.width,
            height: boxRect.height,
            border: "2px solid #4ade80",
            borderRadius: 3,
            boxShadow: "0 0 8px rgba(74,222,128,0.9)",
            pointerEvents: "none",
            transform: rotateDeg ? `rotate(${rotateDeg}deg)` : undefined,
            transformOrigin: "center center",
          }}
        >
          {detection.label && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: -20,
                fontSize: 11,
                fontWeight: 800,
                color: "#04210f",
                background: "#4ade80",
                padding: "1px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              {detection.label}{detection.score != null ? ` ${(detection.score * 100).toFixed(0)}%` : ""}
            </div>
          )}
        </div>
      )}

      {overlay}
      {stream && label && (
        <div style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "white",
          background: "rgba(0,0,0,0.55)",
          padding: "3px 7px",
          borderRadius: 9999,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
