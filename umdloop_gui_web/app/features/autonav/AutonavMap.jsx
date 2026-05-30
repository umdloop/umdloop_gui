"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, Source } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { REGIONS, getActiveRegionKey, setActiveRegionKey } from "../../config";
import { STATUS_COLORS, circlePolygon, targetTypeMeta } from "./missionConstants";

let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}

function headingToCssRotate(rad) {
  return -((rad * 180) / Math.PI) + 90;
}

/**
 * Mission map: satellite pmtiles, rover marker (heading arrow), typed/status
 * target markers, the active target's tolerance ring + a route line from the
 * rover, and click-to-add (forwards lat/lon to the add-target form).
 *
 * @param {Array} targets - enriched targets: { id, label, lat, lon, type, tol, status }
 * @param {string|null} activeId
 * @param {{latitude,longitude}|null} roverPosition
 * @param {number|null} roverHeading
 * @param {function} onAddPoint - ({ lat, lon }) => void
 */
export default function AutonavMap({
  targets = [],
  activeId = null,
  roverPosition = null,
  roverStatus = "no fix",
  roverHeading = null,
  onAddPoint,
}) {
  const [regionKey, setRegionKey] = useState(() => Object.keys(REGIONS)[0]);
  const region = REGIONS[regionKey] || REGIONS[Object.keys(REGIONS)[0]];

  const [viewState, setViewState] = useState(() => ({
    longitude: region.center[0],
    latitude: region.center[1],
    zoom: region.zoom ?? 13,
  }));

  const [followRover, setFollowRover] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [tileMissing, setTileMissing] = useState(false);
  const mapRef = useRef();

  useEffect(() => {
    const stored = getActiveRegionKey();
    if (stored && stored !== regionKey && REGIONS[stored]) {
      setRegionKey(stored);
      const r = REGIONS[stored];
      setViewState((vs) => ({ ...vs, longitude: r.center[0], latitude: r.center[1], zoom: r.zoom ?? vs.zoom }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map centered on the rover while "following".
  useEffect(() => {
    if (followRover && roverPosition) {
      setViewState((vs) => ({ ...vs, latitude: roverPosition.latitude, longitude: roverPosition.longitude }));
    }
  }, [followRover, roverPosition]);

  const handleRegionChange = useCallback((e) => {
    const next = e.target.value;
    setRegionKey(next);
    setActiveRegionKey(next);
    const r = REGIONS[next];
    if (r) setViewState((vs) => ({ ...vs, longitude: r.center[0], latitude: r.center[1], zoom: r.zoom ?? vs.zoom }));
  }, []);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("error", (e) => {
      if (e.sourceId || e.tile || (e.error && e.error.status === 404)) setTileMissing(true);
    });
  }, []);

  const handleMapClick = useCallback(
    (event) => {
      if (!isAdding) return;
      const { lngLat } = event;
      onAddPoint?.({ lat: lngLat.lat, lon: lngLat.lng });
      setIsAdding(false);
    },
    [isAdding, onAddPoint]
  );

  const centerOnRover = () => {
    if (!roverPosition) return;
    setFollowRover(true);
    setViewState((vs) => ({ ...vs, latitude: roverPosition.latitude, longitude: roverPosition.longitude }));
  };

  ensurePmtilesProtocol();

  const mapStyle = useMemo(
    () => ({
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
    }),
    [region.pmtiles]
  );

  const located = targets.filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lon));
  const active = located.find((t) => t.id === activeId);

  // Tolerance ring around the active target.
  const toleranceGeoJSON = useMemo(() => {
    if (!active || !active.tol) return null;
    return circlePolygon(active.lon, active.lat, active.tol);
  }, [active]);

  // Route line: rover → active target.
  const routeGeoJSON = useMemo(() => {
    if (!active || !roverPosition) return null;
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [roverPosition.longitude, roverPosition.latitude],
          [active.lon, active.lat],
        ],
      },
    };
  }, [active, roverPosition]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "8px 14px",
          background: "#2d2d2d",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Mission Map</h1>

        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          Region
          <select
            value={regionKey}
            onChange={handleRegionChange}
            style={{ background: "#3d3d3d", color: "white", border: "1px solid #555", borderRadius: 4, padding: "3px 6px", fontSize: 12 }}
          >
            {Object.entries(REGIONS).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          GPS: <b>{roverStatus}</b>
          {roverPosition && (
            <span style={{ marginLeft: 8 }}>
              {roverPosition.latitude.toFixed(6)}, {roverPosition.longitude.toFixed(6)}
            </span>
          )}
          {roverHeading !== null && roverHeading !== undefined && (
            <span style={{ marginLeft: 8 }}>
              hdg <b>{((roverHeading * 180) / Math.PI).toFixed(0)}°</b>
            </span>
          )}
        </div>

        <button
          onClick={centerOnRover}
          disabled={!roverPosition}
          style={{
            padding: "5px 12px",
            borderRadius: 9999,
            border: "2px solid #1f1e1e",
            background: followRover ? "#1f7a1f" : roverPosition ? "#3d3d3d" : "#2a2a2a",
            color: roverPosition ? "white" : "#666",
            fontWeight: 700,
            fontSize: 12,
            cursor: roverPosition ? "pointer" : "default",
          }}
        >
          {followRover ? "Following" : "Center on Rover"}
        </button>

        <button
          onClick={() => setIsAdding((v) => !v)}
          style={{
            padding: "5px 12px",
            borderRadius: 9999,
            border: "2px solid #1f1e1e",
            background: isAdding ? "#1d4ed8" : "#3d3d3d",
            color: "white",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {isAdding ? "Click map to place…" : "+ Pick on map"}
        </button>

        {tileMissing && (
          <div style={{ background: "#7c2d12", color: "#fca5a5", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
            ⚠ Tiles not cached
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, cursor: isAdding ? "crosshair" : undefined }}>
        <Map
          key={regionKey}
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onDragStart={() => setFollowRover(false)}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
          attributionControl={true}
        >
          {/* Tolerance ring (active target) */}
          {toleranceGeoJSON && (
            <Source id="tolerance" type="geojson" data={toleranceGeoJSON}>
              <Layer id="tolerance-fill" type="fill" paint={{ "fill-color": "#22c55e", "fill-opacity": 0.1 }} />
              <Layer id="tolerance-line" type="line" paint={{ "line-color": "#22c55e", "line-width": 1.5, "line-dasharray": [2, 2] }} />
            </Source>
          )}

          {/* Route line: rover → active target */}
          {routeGeoJSON && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer id="route-line" type="line" paint={{ "line-color": "#ef4444", "line-width": 2, "line-dasharray": [3, 3] }} />
            </Source>
          )}

          {/* Rover marker */}
          {roverPosition && (
            <Marker longitude={roverPosition.longitude} latitude={roverPosition.latitude} anchor="center">
              {roverHeading !== null && roverHeading !== undefined ? (
                <div
                  style={{ transform: `rotate(${headingToCssRotate(roverHeading)}deg)`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                  title={`Rover: ${roverPosition.latitude.toFixed(6)}, ${roverPosition.longitude.toFixed(6)}`}
                >
                  <svg width="22" height="26" viewBox="0 0 20 24">
                    <polygon points="10,0 20,20 10,15 0,20" fill="#22c55e" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
              ) : (
                <div
                  style={{ width: 20, height: 20, background: "#22c55e", border: "3px solid white", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                  title={`Rover: ${roverPosition.latitude.toFixed(6)}, ${roverPosition.longitude.toFixed(6)}`}
                />
              )}
            </Marker>
          )}

          {/* Target markers — colored by type, ringed by status */}
          {located.map((t, idx) => {
            const meta = targetTypeMeta(t.type);
            const statusColor = STATUS_COLORS[t.status] || "#9ca3af";
            const isActive = t.id === activeId;
            return (
              <Marker key={t.id} longitude={t.lon} latitude={t.lat} anchor="bottom">
                <div
                  title={`${t.label || t.id} · ${meta.label}${t.status ? ` · ${t.status}` : ""}`}
                  style={{
                    position: "relative",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: meta.color,
                    border: `3px solid ${statusColor}`,
                    boxShadow: isActive ? "0 0 0 4px rgba(59,130,246,0.5)" : "0 1px 3px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "white",
                  }}
                >
                  {idx + 1}
                </div>
              </Marker>
            );
          })}
        </Map>
      </div>
    </div>
  );
}
