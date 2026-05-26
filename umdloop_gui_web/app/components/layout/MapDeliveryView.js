"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ROSLIB from "roslib";
import MapView from "../map/MapView";
import DeliveryMissionPanel from "./DeliveryMissionPanel";
import { getApiBaseUrl, getRosbridgeUrl, GUI_REQUIRED_TOPICS } from "../../config";

const STORAGE_KEY = "delivery-waypoints";

function loadWaypoints() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function usePortrait() {
  // Always start at `false` (matches server render). Switch to the actual
  // orientation after mount so the hydration tree matches the SSR HTML.
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return portrait;
}

export default function MapDeliveryView({ selectedSubsystem }) {
  // Gate all client-only state (localStorage, window size) behind `mounted`
  // so the first render matches the server-rendered HTML exactly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [waypoints, setWaypoints] = useState([]);
  const [roverPosition, setRoverPosition] = useState(null);
  const [roverHeading, setRoverHeading] = useState(null);
  const [roverStatus, setRoverStatus] = useState("no fix");
  const [panelOpen, setPanelOpen] = useState(true);
  const [tileMissing, setTileMissing] = useState(false);
  const containerRef = useRef(null);
  const rosHeadingRef = useRef(false);
  const portrait = usePortrait();

  // Hydrate waypoints from localStorage once mounted.
  useEffect(() => {
    setWaypoints(loadWaypoints());
  }, []);

  const PANEL_SIZE_KEY = portrait ? "delivery-panel-h" : "delivery-panel-w";
  const DEFAULT_SIZE = portrait ? 340 : 300;
  const [panelSize, setPanelSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(PANEL_SIZE_KEY) : null;
    const n = saved ? parseInt(saved, 10) : NaN;
    setPanelSize(Number.isFinite(n) && n > 0 ? n : DEFAULT_SIZE);
  }, [PANEL_SIZE_KEY, DEFAULT_SIZE]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const onMove = (ev) => {
      const total = portrait ? rect.height : rect.width;
      const pos = portrait ? ev.clientY - rect.top : ev.clientX - rect.left;
      const next = Math.max(220, Math.min(total - 200, total - pos));
      setPanelSize(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setPanelSize((s) => {
        if (typeof window !== "undefined") localStorage.setItem(PANEL_SIZE_KEY, String(s));
        return s;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [portrait, PANEL_SIZE_KEY]);

  useEffect(() => {
    if (!mounted) return;  // skip until after localStorage hydration, so we don't overwrite saved waypoints with []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(waypoints));
  }, [waypoints, mounted]);

  // GPS polling
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/navigation/rover-position`);
        const data = await res.json();
        if (data.fix) {
          setRoverPosition({ latitude: data.latitude, longitude: data.longitude });
          setRoverStatus("fix");
        } else {
          setRoverStatus("no fix");
        }
      } catch {
        setRoverStatus("unreachable");
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  // Heading — ROSLIB primary, REST fallback for dev stub
  useEffect(() => {
    let ros, headingTopic, cleanup = false;
    try {
      ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
      ros.on("connection", () => {
        if (cleanup) return;
        headingTopic = new ROSLIB.Topic({
          ros,
          name: GUI_REQUIRED_TOPICS.heading.name,
          messageType: GUI_REQUIRED_TOPICS.heading.messageType,
        });
        headingTopic.subscribe((msg) => {
          if (msg?.heading !== undefined) {
            rosHeadingRef.current = true;
            setRoverHeading(msg.heading);
          }
        });
      });
    } catch { /* rosbridge not available */ }
    return () => {
      cleanup = true;
      headingTopic?.unsubscribe();
      ros?.close();
    };
  }, []);

  useEffect(() => {
    const poll = async () => {
      if (rosHeadingRef.current) return;
      try {
        const res = await fetch(`${getApiBaseUrl()}/navigation/rover-heading`);
        const data = await res.json();
        if (data.heading !== undefined) setRoverHeading(data.heading);
      } catch { /* not available on production server */ }
    };
    const id = setInterval(poll, 500);
    return () => clearInterval(id);
  }, []);

  const handleAddWaypoint = useCallback(({ lat, lng }) => {
    setWaypoints((prev) => [
      ...prev,
      { id: Date.now(), name: `WP ${prev.length + 1}`, latitude: lat, longitude: lng },
    ]);
  }, []);

  const handleTileMissing = useCallback(() => setTileMissing(true), []);

  return (
    <div ref={containerRef} style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: portrait ? "column" : "row",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Map — takes remaining space */}
      <div style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}>
        <MapView
          titleOverride="Map"
          selectedSubsystem={selectedSubsystem}
          waypoints={waypoints}
          onAddWaypoint={handleAddWaypoint}
          roverPosition={roverPosition}
          roverStatus={roverStatus}
          roverHeading={roverHeading}
          onTileMissing={handleTileMissing}
        />
      </div>

      {/* Collapsed toggle button */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            position: "absolute",
            ...(portrait
              ? { bottom: 0, left: "50%", transform: "translateX(-50%)", borderRadius: "8px 8px 0 0", padding: "8px 24px", borderBottom: "none" }
              : { right: 0, top: "50%", transform: "translateY(-50%)", borderRadius: "8px 0 0 8px", padding: "14px 8px", borderRight: "none" }
            ),
            background: "#1f2937",
            border: "1px solid #374151",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
            zIndex: 10,
            lineHeight: 1,
          }}
          title="Open mission panel"
        >
          {portrait ? "▲ Mission" : "◁"}
        </button>
      )}

      {/* Tile missing toast (when panel is closed) */}
      {tileMissing && !panelOpen && (
        <div style={{
          position: "absolute", right: 12, top: 54, zIndex: 20,
          background: "#7c2d12", color: "#fca5a5", padding: "8px 14px",
          borderRadius: 8, fontSize: "13px", fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          ⚠ Tiles missing
          <button
            onClick={() => setPanelOpen(true)}
            style={{ background: "#991b1b", border: "none", color: "white", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
          >
            Download →
          </button>
        </div>
      )}

      {/* Resize handle between map and panel */}
      {panelOpen && (
        <div
          onPointerDown={startResize}
          title="Drag to resize"
          style={{
            flexShrink: 0,
            background: "#2a2a2a",
            ...(portrait
              ? { height: 6, cursor: "row-resize", borderTop: "1px solid #1f2937", borderBottom: "1px solid #1f2937" }
              : { width: 6, cursor: "col-resize", borderLeft: "1px solid #1f2937", borderRight: "1px solid #1f2937" }),
          }}
        />
      )}

      {/* Mission panel */}
      {panelOpen && (
        <DeliveryMissionPanel
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          roverPosition={roverPosition}
          roverHeading={roverHeading}
          onClose={() => setPanelOpen(false)}
          portrait={portrait}
          size={panelSize}
        />
      )}
    </div>
  );
}
