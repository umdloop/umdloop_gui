"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Map, Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { REGIONS, getActiveRegionKey, setActiveRegionKey } from "../../config";
import { getRoverPosition } from "../../lib/api";

// Register the pmtiles:// protocol with MapLibre once per page load.
let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}

// heading (radians, ROS: 0=East CCW) → CSS rotate degrees for an up-pointing arrow
function headingToCssRotate(rad) {
  return -(rad * 180 / Math.PI) + 90;
}

export default function MapView({
  selectedSubsystem,
  titleOverride,
  // Controlled props — when provided, MapView is a pure display component
  waypoints: externalWaypoints,
  onAddWaypoint,
  roverPosition: externalRoverPos,
  roverStatus: externalRoverStatus,
  roverHeading,
  onTileMissing,
}) {
  const isControlled = externalWaypoints !== undefined;

  // Initial state must match SSR: pick the first registered region, then
  // sync to the user's saved choice (localStorage) after mount.
  const [regionKey, setRegionKey] = useState(() => Object.keys(REGIONS)[0]);
  const region = REGIONS[regionKey] || REGIONS[Object.keys(REGIONS)[0]];

  const [viewState, setViewState] = useState(() => ({
    longitude: region.center[0],
    latitude: region.center[1],
    zoom: region.zoom ?? 13,
  }));

  useEffect(() => {
    const stored = getActiveRegionKey();
    if (stored && stored !== regionKey && REGIONS[stored]) {
      setRegionKey(stored);
      const r = REGIONS[stored];
      setViewState((vs) => ({ ...vs, longitude: r.center[0], latitude: r.center[1], zoom: r.zoom ?? vs.zoom }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegionChange = useCallback((e) => {
    const next = e.target.value;
    setRegionKey(next);
    setActiveRegionKey(next);
    const r = REGIONS[next];
    if (r) {
      setViewState((vs) => ({ ...vs, longitude: r.center[0], latitude: r.center[1], zoom: r.zoom ?? vs.zoom }));
    }
  }, []);

  // Internal state (self-contained mode — used by Drone tab)
  const [internalWaypoints, setInternalWaypoints] = useState([]);
  const [internalRoverPos, setInternalRoverPos] = useState(null);
  const [internalRosStatus, setInternalRosStatus] = useState("no fix");
  const [followRover, setFollowRover] = useState(false);
  const [tileMissingShown, setTileMissingShown] = useState(false);

  const mapRef = useRef();

  const displayedWaypoints = isControlled ? externalWaypoints : internalWaypoints;
  const displayedRoverPos = externalRoverPos ?? internalRoverPos;
  const displayedRosStatus = externalRoverStatus ?? internalRosStatus;

  // GPS polling (only in self-contained mode)
  useEffect(() => {
    if (isControlled) return;
    const poll = async () => {
      try {
        const data = await getRoverPosition();
        if (data.fix) {
          const pos = { latitude: data.latitude, longitude: data.longitude };
          setInternalRoverPos(pos);
          setInternalRosStatus("fix");
          setFollowRover((prev) => {
            if (prev) setViewState((vs) => ({ ...vs, latitude: pos.latitude, longitude: pos.longitude }));
            return prev;
          });
        } else {
          setInternalRosStatus("no fix");
        }
      } catch {
        setInternalRosStatus("unreachable");
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [isControlled]);

  // Attach tile-error listener once map loads
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("error", (e) => {
      // MapLibre fires error events for tile load failures
      if (e.sourceId || e.tile || (e.error && e.error.status === 404)) {
        setTileMissingShown(true);
        onTileMissing?.();
      }
    });
  }, [onTileMissing]);

  const centerOnRover = () => {
    if (!displayedRoverPos) return;
    setFollowRover(true);
    setViewState((vs) => ({ ...vs, latitude: displayedRoverPos.latitude, longitude: displayedRoverPos.longitude }));
  };

  const handleDragStart = useCallback(() => setFollowRover(false), []);

  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    if (isControlled) {
      onAddWaypoint?.({ lng: lngLat.lng, lat: lngLat.lat });
    } else {
      setInternalWaypoints((prev) => [
        ...prev,
        { id: Date.now(), name: `WP ${prev.length + 1}`, longitude: lngLat.lng, latitude: lngLat.lat },
      ]);
    }
  }, [isControlled, onAddWaypoint]);

  const deleteWaypoint = (id) => setInternalWaypoints((prev) => prev.filter((wp) => wp.id !== id));
  const deleteAllWaypoints = () => setInternalWaypoints([]);

  ensurePmtilesProtocol();

  const mapStyle = {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        url: `pmtiles://${region.pmtiles}`,
        tileSize: 256,
        attribution: "© MapTiler © OpenStreetMap contributors",
      },
    },
    layers: [{ id: "satellite", type: "raster", source: "satellite", minzoom: 0, maxzoom: 22 }],
  };

  const routeGeoJSON = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: displayedWaypoints.map((wp) => [wp.longitude, wp.latitude]),
    },
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", background: "#2d2d2d", color: "white", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{titleOverride || `${selectedSubsystem} — Map`}</h1>

        <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 6 }}>
          Region
          <select
            value={regionKey}
            onChange={handleRegionChange}
            style={{ background: "#3d3d3d", color: "white", border: "1px solid #555", borderRadius: 4, padding: "3px 6px", fontSize: "12px" }}
          >
            {Object.entries(REGIONS).map(([key, r]) => (
              <option key={key} value={key}>{r.label}</option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: "12px", opacity: 0.8 }}>
          GPS: <b>{displayedRosStatus}</b>
          {displayedRoverPos && (
            <span style={{ marginLeft: 8 }}>
              {displayedRoverPos.latitude.toFixed(6)}, {displayedRoverPos.longitude.toFixed(6)}
            </span>
          )}
          {roverHeading !== null && roverHeading !== undefined && (
            <span style={{ marginLeft: 8 }}>
              hdg: <b>{(roverHeading * 180 / Math.PI).toFixed(1)}°</b>
            </span>
          )}
        </div>

        <button
          onClick={centerOnRover}
          disabled={!displayedRoverPos}
          style={{
            padding: "5px 14px", borderRadius: 9999, border: "2px solid #1f1e1e",
            background: followRover ? "#1f7a1f" : displayedRoverPos ? "#3d3d3d" : "#2a2a2a",
            color: displayedRoverPos ? "white" : "#666", fontWeight: 700, fontSize: "12px",
            cursor: displayedRoverPos ? "pointer" : "default",
          }}
        >
          {followRover ? "Following" : "Center on Rover"}
        </button>

        {/* Tile missing badge */}
        {tileMissingShown && (
          <div style={{ background: "#7c2d12", color: "#fca5a5", padding: "4px 10px", borderRadius: 6, fontSize: "11px", fontWeight: 700 }}>
            ⚠ Tiles not cached — use side panel to download
          </div>
        )}

        {/* Self-contained waypoint controls (Drone mode) */}
        {!isControlled && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "12px" }}>Waypoints: {displayedWaypoints.length}</span>
            {displayedWaypoints.length > 0 && (
              <button
                onClick={deleteAllWaypoints}
                style={{ padding: "4px 12px", cursor: "pointer", background: "#c90202", color: "white", border: "none", borderRadius: 6, fontWeight: 700, fontSize: "12px" }}
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Self-contained waypoint list (Drone mode) */}
      {!isControlled && displayedWaypoints.length > 0 && (
        <div style={{ background: "#252525", padding: "4px 16px", maxHeight: 80, overflowY: "auto", borderBottom: "1px solid #333", flexShrink: 0 }}>
          {displayedWaypoints.map((wp, idx) => (
            <div key={wp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", borderBottom: "1px solid #2a2a2a", color: "white" }}>
              <span style={{ fontSize: "11px" }}>#{idx + 1} {wp.name}: ({wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)})</span>
              <button onClick={() => deleteWaypoint(wp.id)} style={{ padding: "1px 7px", cursor: "pointer", background: "#960303", color: "white", border: "none", borderRadius: 3, fontSize: "10px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <Map
          key={regionKey}
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onDragStart={handleDragStart}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          attributionControl={true}
        >
          {/* Route polyline */}
          {displayedWaypoints.length > 1 && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="route-line"
                type="line"
                paint={{ "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [3, 3] }}
              />
            </Source>
          )}

          {/* Rover marker */}
          {displayedRoverPos && (
            <Marker longitude={displayedRoverPos.longitude} latitude={displayedRoverPos.latitude} anchor="center">
              {roverHeading !== null && roverHeading !== undefined ? (
                <div
                  style={{ transform: `rotate(${headingToCssRotate(roverHeading)}deg)`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                  title={`Rover: ${displayedRoverPos.latitude.toFixed(6)}, ${displayedRoverPos.longitude.toFixed(6)}`}
                >
                  <svg width="20" height="24" viewBox="0 0 20 24">
                    <polygon points="10,0 20,20 10,15 0,20" fill="#22c55e" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
              ) : (
                <div
                  style={{ width: 20, height: 20, background: "#22c55e", border: "3px solid white", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                  title={`Rover: ${displayedRoverPos.latitude.toFixed(6)}, ${displayedRoverPos.longitude.toFixed(6)}`}
                />
              )}
            </Marker>
          )}

          {/* Waypoint markers */}
          {displayedWaypoints.map((wp, idx) => (
            <Marker key={wp.id} longitude={wp.longitude} latitude={wp.latitude} anchor="bottom">
              <div
                style={{
                  background: "#ef4444", borderRadius: "50%", width: 22, height: 22,
                  border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: "bold", color: "white", cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                }}
                title={`${wp.name || `WP ${idx + 1}`}: (${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)})`}
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
