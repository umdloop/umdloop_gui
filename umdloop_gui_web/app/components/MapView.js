"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getTileSource } from "../lib/map/tile-source";

/**
 * Main MapLibre map component.
 *
 * Renders a satellite map with waypoint markers, rover marker, and direction arrows.
 * Supports offline tiles when NEXT_PUBLIC_USE_LOCAL_TILES=true.
 *
 * Requirements: 13.1, 13.2, 14.1, 14.2, 18.1, 18.2, 18.3
 *
 * @param {{
 *   waypoints?: Array<{latitude: number, longitude: number, index: number}>,
 *   roverPosition?: {latitude: number, longitude: number},
 *   roverHeading?: number,
 *   cameraHeading?: number,
 *   dronePosition?: {latitude: number, longitude: number},
 *   droneHeading?: number,
 *   style?: object,
 *   center?: [number, number],
 *   zoom?: number,
 * }} props
 */
export default function MapView({
  waypoints = [],
  roverPosition = null,
  roverHeading = null,
  cameraHeading = 0,
  dronePosition = null,
  droneHeading = null,
  style = {},
  center = [-110.785, 38.425],
  zoom = 15,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const roverMarkerRef = useRef(null);
  const droneMarkerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const tileSource = getTileSource();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: tileSource,
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite",
          },
        ],
      },
      center,
      zoom,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update waypoint markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    // Add new markers
    for (const wp of waypoints) {
      const el = document.createElement("div");
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.background = "#ff6600";
      el.style.border = "2px solid #fff";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "10px";
      el.style.color = "#fff";
      el.style.fontWeight = "bold";
      el.textContent = String(wp.index);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wp.longitude, wp.latitude])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    }
  }, [waypoints]);

  // Update rover marker with heading arrow
  useEffect(() => {
    if (!mapRef.current) return;

    if (roverMarkerRef.current) {
      roverMarkerRef.current.remove();
      roverMarkerRef.current = null;
    }

    if (!roverPosition) return;

    const el = createArrowElement("#00cc44", roverHeading || 0);
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([roverPosition.longitude, roverPosition.latitude])
      .addTo(mapRef.current);

    roverMarkerRef.current = marker;
  }, [roverPosition, roverHeading]);

  // Update drone marker with heading arrow
  useEffect(() => {
    if (!mapRef.current) return;

    if (droneMarkerRef.current) {
      droneMarkerRef.current.remove();
      droneMarkerRef.current = null;
    }

    if (!dronePosition) return;

    const el = createArrowElement("#0088ff", droneHeading || 0);
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([dronePosition.longitude, dronePosition.latitude])
      .addTo(mapRef.current);

    droneMarkerRef.current = marker;
  }, [dronePosition, droneHeading]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "300px", ...style }}
      aria-label="Navigation map"
    />
  );
}

/**
 * Creates an arrow marker element for direction display.
 * @param {string} color - CSS color for the arrow.
 * @param {number} headingDeg - Heading in degrees clockwise from north.
 * @returns {HTMLElement}
 */
function createArrowElement(color, headingDeg) {
  const el = document.createElement("div");
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.position = "relative";

  const arrow = document.createElement("div");
  arrow.style.width = "0";
  arrow.style.height = "0";
  arrow.style.borderLeft = "8px solid transparent";
  arrow.style.borderRight = "8px solid transparent";
  arrow.style.borderBottom = `20px solid ${color}`;
  arrow.style.position = "absolute";
  arrow.style.top = "2px";
  arrow.style.left = "8px";
  arrow.style.transformOrigin = "center bottom";
  arrow.style.transform = `rotate(${headingDeg}deg)`;

  const dot = document.createElement("div");
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "50%";
  dot.style.background = color;
  dot.style.position = "absolute";
  dot.style.bottom = "4px";
  dot.style.left = "11px";

  el.appendChild(arrow);
  el.appendChild(dot);
  return el;
}
