"use client";

import { useState } from "react";
import { isValidCoordinate } from "../lib/waypoint-store";

/**
 * Waypoint entry form — text inputs for latitude and longitude.
 * Validates coordinates and calls onAdd callback with valid values.
 *
 * Requirements: 12.1
 *
 * @param {{ onAdd: (lat: number, lon: number, label?: string) => void }} props
 */
export default function WaypointEntryForm({ onAdd }) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!isValidCoordinate(latitude, longitude)) {
      setError("Invalid coordinates. Latitude must be [-90, 90], longitude [-180, 180].");
      return;
    }

    onAdd(latitude, longitude, label.trim() || undefined);
    setLat("");
    setLon("");
    setLabel("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="wp-lat" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
          Latitude
        </label>
        <input
          id="wp-lat"
          type="text"
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="-90 to 90"
          style={{ width: "120px", padding: "4px 6px" }}
          required
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="wp-lon" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
          Longitude
        </label>
        <input
          id="wp-lon"
          type="text"
          inputMode="decimal"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="-180 to 180"
          style={{ width: "120px", padding: "4px 6px" }}
          required
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="wp-label" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
          Label (optional)
        </label>
        <input
          id="wp-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Waypoint name"
          style={{ width: "140px", padding: "4px 6px" }}
        />
      </div>
      <button type="submit" style={{ padding: "4px 12px", cursor: "pointer" }}>
        Add
      </button>
      {error && (
        <span role="alert" style={{ color: "red", fontSize: "0.8rem" }}>
          {error}
        </span>
      )}
    </form>
  );
}
