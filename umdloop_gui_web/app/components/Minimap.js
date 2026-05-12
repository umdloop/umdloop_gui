"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getTileSource } from "../lib/map/tile-source";

/**
 * Minimap component — renders in the bottom-right quadrant of the navigator page.
 * Updates rover position marker within 1 second of receiving a new GPS fix.
 *
 * Requirements: 13.1, 13.2
 *
 * @param {{
 *   roverPosition?: {latitude: number, longitude: number},
 *   center?: [number, number],
 *   zoom?: number,
 * }} props
 */
export default function Minimap({
  roverPosition = null,
  center = [-110.785, 38.425],
  zoom = 14,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize minimap
  useEffect(() => {
    if (!containerRef.current) return;

    const tileSource = getTileSource();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { satellite: tileSource },
        layers: [{ id: "satellite-layer", type: "raster", source: "satellite" }],
      },
      center,
      zoom,
      interactive: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update rover marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (!roverPosition) return;

    const el = document.createElement("div");
    el.style.width = "12px";
    el.style.height = "12px";
    el.style.borderRadius = "50%";
    el.style.background = "#00cc44";
    el.style.border = "2px solid #fff";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([roverPosition.longitude, roverPosition.latitude])
      .addTo(mapRef.current);

    markerRef.current = marker;

    // Center minimap on rover
    mapRef.current.setCenter([roverPosition.longitude, roverPosition.latitude]);
  }, [roverPosition]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        bottom: "16px",
        right: "16px",
        width: "200px",
        height: "200px",
        borderRadius: "8px",
        border: "2px solid rgba(255,255,255,0.5)",
        overflow: "hidden",
        zIndex: 100,
      }}
      aria-label="Minimap"
    />
  );
}
