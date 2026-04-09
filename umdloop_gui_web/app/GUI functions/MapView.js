"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Map, Marker } from "react-map-gl/maplibre";
import ROSLIB from "roslib";
import "maplibre-gl/dist/maplibre-gl.css";
import { getRosbridgeUrl, useLocalTiles } from "../config";

const GPS_TOPIC = "/gps/fix";
const GPS_MSG_TYPE = "sensor_msgs/msg/NavSatFix";

export default function MapView({ selectedSubsystem, titleOverride }) {
  const [viewState, setViewState] = useState({
    longitude: -76.9378,
    latitude: 38.9897,
    zoom: 13,
  });
  const [inputLat, setInputLat] = useState("38.9897");
  const [inputLon, setInputLon] = useState("-76.9378");
  const [waypoints, setWaypoints] = useState([]);
  const [roverPosition, setRoverPosition] = useState(null);
  const [rosStatus, setRosStatus] = useState("disconnected");
  const mapRef = useRef();

  // Subscribe to rover GPS over Rosbridge (rover → radio → base station)
  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    let gpsListener = null;

    ros.on("connection", () => setRosStatus("connected"));
    ros.on("error", () => setRosStatus("error"));
    ros.on("close", () => {
      setRosStatus("disconnected");
      setRoverPosition(null);
    });

    gpsListener = new ROSLIB.Topic({
      ros,
      name: GPS_TOPIC,
      messageType: GPS_MSG_TYPE,
    });
    gpsListener.subscribe((msg) => {
      if (msg.latitude != null && msg.longitude != null) {
        setRoverPosition({ latitude: msg.latitude, longitude: msg.longitude });
      }
    });

    return () => {
      if (gpsListener) gpsListener.unsubscribe();
      ros.close();
    };
  }, []);

  const handleCoordinateSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);

    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      setViewState({
        ...viewState,
        latitude: lat,
        longitude: lon,
        zoom: 13,
      });
    } else {
      alert(
        "Please enter valid coordinates. Latitude: -90 to 90, Longitude: -180 to 180"
      );
    }
  };

  const handleMapClick = useCallback(
    (event) => {
      const { lngLat } = event;
      const newWaypoint = {
        id: Date.now(),
        longitude: lngLat.lng,
        latitude: lngLat.lat,
      };
      setWaypoints([...waypoints, newWaypoint]);
    },
    [waypoints]
  );

  const deleteWaypoint = (id) => {
    setWaypoints(waypoints.filter((wp) => wp.id !== id));
  };

  const deleteAllWaypoints = () => {
    setWaypoints([]);
  };

  // Satellite tile source: local (offline) or MapTiler CDN (online).
  // To use local tiles, run `python3 scripts/download_tiles.py` then set
  // NEXT_PUBLIC_USE_LOCAL_TILES=true in .env.local (or at build time).
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
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px", background: "#2d2d2d", color: "white" }}>
        <h1>{titleOverride || `${selectedSubsystem} - Map View`}</h1>
        <p style={{ marginTop: "8px", fontSize: "14px", opacity: 0.9 }}>
          Rover link: <span style={{ fontWeight: "bold" }}>{rosStatus}</span>
          {roverPosition && (
            <span style={{ marginLeft: "12px" }}>
              Rover at {roverPosition.latitude.toFixed(6)}, {roverPosition.longitude.toFixed(6)}
            </span>
          )}
        </p>
        <form
          onSubmit={handleCoordinateSubmit}
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <label>
            Latitude:
            <input
              type="text"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              placeholder="38.9897"
              style={{ marginLeft: "10px", padding: "5px", width: "120px" }}
            />
          </label>
          <label>
            Longitude:
            <input
              type="text"
              value={inputLon}
              onChange={(e) => setInputLon(e.target.value)}
              placeholder="-76.9378"
              style={{ marginLeft: "10px", padding: "5px", width: "120px" }}
            />
          </label>
          <button
            type="submit"
            style={{ padding: "5px 15px", cursor: "pointer" }}
          >
            Go to Location
          </button>
        </form>

        <div
          style={{
            marginTop: "15px",
            display: "flex",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>Waypoints: {waypoints.length}</div>
          {waypoints.length > 0 && (
            <button
              onClick={deleteAllWaypoints}
              style={{
                padding: "5px 15px",
                cursor: "pointer",
                background: "#c90202",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Clear All Waypoints
            </button>
          )}
        </div>

        {waypoints.length > 0 && (
          <div
            style={{ marginTop: "10px", maxHeight: "100px", overflowY: "auto" }}
          >
            <strong>Waypoint List:</strong>
            {waypoints.map((wp, idx) => (
              <div
                key={wp.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  borderBottom: "1px solid #444",
                }}
              >
                <span style={{ fontSize: "12px" }}>
                  #{idx + 1}: ({wp.latitude.toFixed(6)},{" "}
                  {wp.longitude.toFixed(6)})
                </span>
                <button
                  onClick={() => deleteWaypoint(wp.id)}
                  style={{
                    padding: "2px 8px",
                    cursor: "pointer",
                    background: "#960303",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    fontSize: "10px",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
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
                title={`Waypoint ${idx + 1}: (${waypoint.latitude.toFixed(
                  6
                )}, ${waypoint.longitude.toFixed(6)})`}
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
