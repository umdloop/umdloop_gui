"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Map, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocalTiles } from "../config";

export default function MapView({ selectedSubsystem, titleOverride }) {
  const [viewState, setViewState] = useState({
    longitude: -76.9378,
    latitude: 38.9897,
    zoom: 13,
  });
  const [waypoints, setWaypoints] = useState([]);
  const [roverPosition, setRoverPosition] = useState(null);
  const [rosStatus, setRosStatus] = useState("no fix");
  const [followRover, setFollowRover] = useState(false);
  const mapRef = useRef();

  // Poll Flask backend for latest /gps/fix data (sourced from ROS via ros_bridge.py)
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/navigation/rover-position");
        const data = await res.json();
        if (data.fix) {
          const pos = { latitude: data.latitude, longitude: data.longitude };
          setRoverPosition(pos);
          setRosStatus("fix");
          // Keep map centered on rover when follow mode is active
          setFollowRover((prev) => {
            if (prev) {
              setViewState((vs) => ({ ...vs, latitude: pos.latitude, longitude: pos.longitude }));
            }
            return prev;
          });
        } else {
          setRosStatus("no fix");
        }
      } catch {
        setRosStatus("unreachable");
      }
    };

    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  // Snap to rover and enable follow mode
  const centerOnRover = () => {
    if (!roverPosition) return;
    setFollowRover(true);
    setViewState((vs) => ({
      ...vs,
      latitude: roverPosition.latitude,
      longitude: roverPosition.longitude,
    }));
  };

  // Any manual drag breaks follow mode
  const handleDragStart = useCallback(() => {
    setFollowRover(false);
  }, []);

  const handleMapClick = useCallback(
    (event) => {
      const { lngLat } = event;
      setWaypoints((prev) => [
        ...prev,
        { id: Date.now(), longitude: lngLat.lng, latitude: lngLat.lat },
      ]);
    },
    []
  );

  const deleteWaypoint = (id) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
  };

  const deleteAllWaypoints = () => setWaypoints([]);

  const MAPTILER_KEY = "DDQqKsPBfdOZOVxgcoy5";
  const tileUrl = useLocalTiles()
    ? "/tiles/{z}/{x}/{y}.jpg"
    : `https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`;

  const mapStyle = {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        attribution: useLocalTiles()
          ? "Offline tiles"
          : "© MapTiler © OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Header bar */}
      <div style={{ padding: "12px 20px", background: "#2d2d2d", color: "white", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "18px" }}>{titleOverride || `${selectedSubsystem} - Map View`}</h1>

        <div style={{ fontSize: "13px", opacity: 0.85 }}>
          GPS: <span style={{ fontWeight: "bold" }}>{rosStatus}</span>
          {roverPosition && (
            <span style={{ marginLeft: "10px" }}>
              {roverPosition.latitude.toFixed(6)}, {roverPosition.longitude.toFixed(6)}
            </span>
          )}
        </div>

        {/* Center on Rover button */}
        <button
          onClick={centerOnRover}
          disabled={!roverPosition}
          style={{
            padding: "6px 16px",
            borderRadius: "9999px",
            border: "2px solid #1f1e1eff",
            background: followRover ? "#1f7a1f" : roverPosition ? "#3d3d3d" : "#2a2a2a",
            color: roverPosition ? "white" : "#666",
            fontWeight: 700,
            fontSize: "13px",
            cursor: roverPosition ? "pointer" : "default",
            transition: "background 0.15s ease",
          }}
        >
          {followRover ? "Following Rover" : "Center on Rover"}
        </button>

        {/* Waypoint controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
          <span style={{ fontSize: "13px" }}>Waypoints: {waypoints.length}</span>
          {waypoints.length > 0 && (
            <button
              onClick={deleteAllWaypoints}
              style={{
                padding: "6px 14px",
                cursor: "pointer",
                background: "#c90202",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Waypoint list (collapsible) */}
      {waypoints.length > 0 && (
        <div style={{ background: "#252525", padding: "6px 20px", maxHeight: "90px", overflowY: "auto", borderBottom: "1px solid #333" }}>
          {waypoints.map((wp, idx) => (
            <div
              key={wp.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid #333", color: "white" }}
            >
              <span style={{ fontSize: "12px" }}>
                #{idx + 1}: ({wp.latitude.toFixed(6)}, {wp.longitude.toFixed(6)})
              </span>
              <button
                onClick={() => deleteWaypoint(wp.id)}
                style={{ padding: "2px 8px", cursor: "pointer", background: "#960303", color: "white", border: "none", borderRadius: "3px", fontSize: "10px" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onDragStart={handleDragStart}
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          attributionControl={true}
        >
          {roverPosition && (
            <Marker
              longitude={roverPosition.longitude}
              latitude={roverPosition.latitude}
              anchor="center"
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "#22c55e",
                  border: "3px solid white",
                  borderRadius: "50%",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
                title={`Rover: ${roverPosition.latitude.toFixed(6)}, ${roverPosition.longitude.toFixed(6)}`}
              />
            </Marker>
          )}

          {waypoints.map((waypoint, idx) => (
            <Marker
              key={waypoint.id}
              longitude={waypoint.longitude}
              latitude={waypoint.latitude}
              anchor="bottom"
            >
              <div
                style={{
                  background: "red",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  border: "2px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "white",
                  cursor: "pointer",
                }}
                title={`Waypoint ${idx + 1}: (${waypoint.latitude.toFixed(6)}, ${waypoint.longitude.toFixed(6)})`}
              >
                {idx + 1}
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
