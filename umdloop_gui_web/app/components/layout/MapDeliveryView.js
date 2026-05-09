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
  const [portrait, setPortrait] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false
  );
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return portrait;
}

export default function MapDeliveryView({ selectedSubsystem }) {
  const [waypoints, setWaypoints] = useState(loadWaypoints);
  const [roverPosition, setRoverPosition] = useState(null);
  const [roverHeading, setRoverHeading] = useState(null);
  const [roverStatus, setRoverStatus] = useState("no fix");
  const [panelOpen, setPanelOpen] = useState(true);
  const [tileMissing, setTileMissing] = useState(false);
  const rosHeadingRef = useRef(false);
  const portrait = usePortrait();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(waypoints));
  }, [waypoints]);

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
    <div style={{
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

      {/* Mission panel */}
      {panelOpen && (
        <DeliveryMissionPanel
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          roverPosition={roverPosition}
          roverHeading={roverHeading}
          onClose={() => setPanelOpen(false)}
          portrait={portrait}
        />
      )}
    </div>
  );
}
