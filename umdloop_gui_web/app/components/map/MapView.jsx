"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Map, Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { REGIONS, getActiveRegionKey, setActiveRegionKey } from "../../config";
import { getRoverPosition } from "../../lib/api";
import { usePendingWaypoints, addPendingWaypoint } from "../../lib/pendingWaypointsStore";
import { usePastWaypoints } from "../../lib/pastWaypointsStore";

let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}

function headingToCssRotate(rad) {
  return -(rad * 180 / Math.PI) + 90;
}

export default function MapView({
  selectedSubsystem,
  titleOverride,
  // Controlled props — used by MapDeliveryView to pass external waypoints
  waypoints: externalWaypoints,
  onAddWaypoint,
  roverPosition: externalRoverPos,
  roverStatus: externalRoverStatus,
  roverHeading,
  onTileMissing,
}) {
  const isControlled = externalWaypoints !== undefined;

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

  const [internalRoverPos, setInternalRoverPos] = useState(null);
  const [internalRosStatus, setInternalRosStatus] = useState("no fix");
  const [followRover, setFollowRover] = useState(false);
  const [tileMissingShown, setTileMissingShown] = useState(false);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);

  const pendingWaypoints = usePendingWaypoints();
  const pastWaypoints = usePastWaypoints();

  const mapRef = useRef();

  const displayedRoverPos = externalRoverPos ?? internalRoverPos;
  const displayedRosStatus = externalRoverStatus ?? internalRosStatus;

  // GPS polling (self-contained mode only)
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

  const flyToWaypoint = useCallback((wp) => {
    setFollowRover(false);
    setViewState((vs) => ({ ...vs, latitude: wp.latitude, longitude: wp.longitude }));
  }, []);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("error", (e) => {
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
    if (isAddingWaypoint) {
      addPendingWaypoint({ latitude: lngLat.lat, longitude: lngLat.lng, mode: "GNSS" });
      return;
    }
    if (isControlled) {
      onAddWaypoint?.({ lng: lngLat.lng, lat: lngLat.lat });
    }
  }, [isAddingWaypoint, isControlled, onAddWaypoint]);

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

  // Route polyline for controlled (MapDeliveryView) mode
  const externalRouteGeoJSON = isControlled && externalWaypoints.length > 1 ? {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: externalWaypoints.map((wp) => [wp.longitude, wp.latitude]),
    },
  } : null;

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

        <button
          onClick={() => setIsAddingWaypoint((v) => !v)}
          style={{
            padding: "5px 14px", borderRadius: 9999, border: "2px solid #1f1e1e",
            background: isAddingWaypoint ? "#1d4ed8" : "#3d3d3d",
            color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          {isAddingWaypoint ? "Click map to place…" : "+ Add Waypoint"}
        </button>

        {tileMissingShown && (
          <div style={{ background: "#7c2d12", color: "#fca5a5", padding: "4px 10px", borderRadius: 6, fontSize: "11px", fontWeight: 700 }}>
            ⚠ Tiles not cached — use side panel to download
          </div>
        )}
      </div>

      {/* Map + waypoint side panel */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative", minHeight: 0, cursor: isAddingWaypoint ? "crosshair" : undefined }}>
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
            {/* Route polyline (controlled/MapDeliveryView mode only) */}
            {externalRouteGeoJSON && (
              <Source id="route" type="geojson" data={externalRouteGeoJSON}>
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

            {/* External waypoint markers (MapDeliveryView controlled mode) */}
            {isControlled && externalWaypoints.map((wp, idx) => (
              <Marker key={wp.id} longitude={wp.longitude} latitude={wp.latitude} anchor="bottom">
                <div
                  style={{
                    background: "#ef4444", borderRadius: "50%", width: 22, height: 22,
                    border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "bold", color: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                  title={`${wp.name || `WP ${idx + 1}`}: (${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)})`}
                >
                  {idx + 1}
                </div>
              </Marker>
            ))}

            {/* Pending waypoints (blue) */}
            {pendingWaypoints.map((wp, idx) => (
              <Marker key={`pending-${wp.id}`} longitude={wp.longitude} latitude={wp.latitude} anchor="bottom">
                <div
                  style={{
                    background: "#3b82f6", borderRadius: "50%", width: 22, height: 22,
                    border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "bold", color: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                  title={`Pending #${idx + 1}${wp.mode ? ` (${wp.mode})` : ""}: (${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)})`}
                >
                  {idx + 1}
                </div>
              </Marker>
            ))}

            {/* Past waypoints (amber) */}
            {pastWaypoints.map((wp, idx) => (
              <Marker key={`past-${wp.id}`} longitude={wp.longitude} latitude={wp.latitude} anchor="bottom">
                <div
                  style={{
                    background: "#f59e0b", borderRadius: "50%", width: 18, height: 18,
                    border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "9px", fontWeight: "bold", color: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                  title={`Past #${idx + 1}: (${wp.latitude.toFixed(5)}, ${wp.longitude.toFixed(5)})`}
                >
                  {idx + 1}
                </div>
              </Marker>
            ))}
          </Map>
        </div>

        {/* Right-side waypoint panel */}
        <aside
          style={{
            width: 280, flexShrink: 0, background: "#1f1f1f",
            borderLeft: "1px solid #333", color: "white",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Pending section */}
          <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #2a2a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Pending</span>
              <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>{pendingWaypoints.length}</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: "0 1 50%", padding: "4px 10px 8px" }}>
            {pendingWaypoints.length === 0 && (
              <div style={{ color: "#666", fontSize: 12, padding: "4px 4px 8px" }}>None</div>
            )}
            {pendingWaypoints.map((wp, idx) => (
              <button
                key={`p-${wp.id}`}
                onClick={() => flyToWaypoint(wp)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "6px 8px", marginBottom: 4,
                  background: "#2b2b2b", border: "1px solid #333", borderRadius: 6,
                  color: "white", textAlign: "left", cursor: "pointer", fontSize: 11,
                }}
                title="Click to center map"
              >
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#3b82f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}</div>
                  {wp.mode && <div style={{ opacity: 0.7, fontSize: 10 }}>{wp.mode}</div>}
                </span>
              </button>
            ))}
          </div>

          {/* Past section */}
          <div style={{ padding: "10px 14px 6px", borderTop: "1px solid #2a2a2a", borderBottom: "1px solid #2a2a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Past</span>
              <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>{pastWaypoints.length}</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: "0 1 50%", padding: "4px 10px 8px" }}>
            {pastWaypoints.length === 0 && (
              <div style={{ color: "#666", fontSize: 12, padding: "4px 4px 8px" }}>None</div>
            )}
            {pastWaypoints.map((wp, idx) => (
              <button
                key={`pw-${wp.id}`}
                onClick={() => flyToWaypoint(wp)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "6px 8px", marginBottom: 4,
                  background: "#2b2b2b", border: "1px solid #333", borderRadius: 6,
                  color: "white", textAlign: "left", cursor: "pointer", fontSize: 11,
                }}
                title="Click to center map"
              >
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#f59e0b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}</div>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
