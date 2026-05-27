"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MiniMapHUD, { euclideanMeters } from "./MiniMapHUD";
import { getApiBaseUrl } from "../../config";
import { COORD_FORMATS, parseCoord } from "../../lib/coords";

const COORD_FORMAT_STORAGE_KEY = "delivery-coord-format";

const MAX_SPEED_MPS = 1.0;

function formatETA(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// Delete button that requires two taps to confirm (resets after 2.5 s)
function DeleteButton({ onDelete }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  const handleClick = () => {
    if (armed) {
      onDelete();
      setArmed(false);
      clearTimeout(timerRef.current);
    } else {
      setArmed(true);
      timerRef.current = setTimeout(() => setArmed(false), 2500);
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      onClick={handleClick}
      style={{
        minWidth: 44,
        height: 44,
        borderRadius: 8,
        border: armed ? "2px solid #ef4444" : "1px solid #374151",
        background: armed ? "#7f1d1d" : "#1f2937",
        color: armed ? "#fca5a5" : "#9ca3af",
        cursor: "pointer",
        fontSize: armed ? 11 : 16,
        fontWeight: 700,
        transition: "all 0.15s",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={armed ? "Tap again to confirm delete" : "Delete waypoint"}
    >
      {armed ? "Sure?" : "✕"}
    </button>
  );
}

function WaypointRow({ wp, idx, isNext, onDelete, onEdit, onMoveUp, onMoveDown, canMoveUp, canMoveDown, roverPosition, coordFormat }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: wp.name, lat: String(wp.latitude), lon: String(wp.longitude) });
  const [editError, setEditError] = useState("");

  const distM = roverPosition ? euclideanMeters(roverPosition, wp) : null;
  const fmt = COORD_FORMATS[coordFormat] || COORD_FORMATS.DD;

  const commit = () => {
    const lat = parseCoord(draft.lat, { axis: "lat", format: coordFormat });
    const lon = parseCoord(draft.lon, { axis: "lon", format: coordFormat });
    if (!lat.ok) { setEditError(`Lat: ${lat.error}`); return; }
    if (!lon.ok) { setEditError(`Lon: ${lon.error}`); return; }
    onEdit(wp.id, { name: draft.name.trim() || wp.name, latitude: lat.value, longitude: lon.value });
    setEditError("");
    setEditing(false);
  };

  const cancel = () => {
    setDraft({ name: wp.name, lat: String(wp.latitude), lon: String(wp.longitude) });
    setEditing(false);
  };

  return (
    <div style={{
      background: isNext ? "#14261a" : "#1a1a1a",
      border: `1px solid ${isNext ? "#22c55e" : "#2d2d2d"}`,
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 6,
    }}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name"
            autoFocus
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <input value={draft.lat} onChange={(e) => setDraft((d) => ({ ...d, lat: e.target.value }))} placeholder={`Lat (${fmt.placeholderLat})`} style={{ ...inputStyle, flex: 1 }} />
            <input value={draft.lon} onChange={(e) => setDraft((d) => ({ ...d, lon: e.target.value }))} placeholder={`Lon (${fmt.placeholderLon})`} style={{ ...inputStyle, flex: 1 }} />
          </div>
          {editError && <div style={{ color: "#f87171", fontSize: 11 }}>{editError}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={commit} style={{ ...actionBtn, background: "#166534", flex: 1 }}>Save</button>
            <button onClick={cancel} style={{ ...actionBtn, background: "#374151", flex: 1 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Index badge */}
          <div style={{
            minWidth: 28, height: 28, borderRadius: 6,
            background: isNext ? "#166534" : "#1f2937",
            color: isNext ? "#86efac" : "#6b7280",
            fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {idx + 1}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: isNext ? "#86efac" : "white", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {wp.name || `WP ${idx + 1}`}
            </div>
            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 1 }}>
              {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
              {distM !== null && (
                <span style={{ marginLeft: 6, color: isNext ? "#4ade80" : "#9ca3af", fontWeight: isNext ? 700 : 400 }}>
                  {distM < 1000 ? `${distM.toFixed(0)} m` : `${(distM / 1000).toFixed(2)} km`}
                </span>
              )}
            </div>
          </div>

          {/* Reorder */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              style={{ ...reorderBtn, opacity: canMoveUp ? 1 : 0.2 }}
              title="Move up"
            >▲</button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              style={{ ...reorderBtn, opacity: canMoveDown ? 1 : 0.2 }}
              title="Move down"
            >▼</button>
          </div>

          {/* Edit */}
          <button
            onClick={() => setEditing(true)}
            style={{ minWidth: 44, height: 44, borderRadius: 8, border: "1px solid #374151", background: "#1f2937", color: "#60a5fa", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            title="Edit waypoint"
          >✎</button>

          {/* Delete (two-tap) */}
          <DeleteButton onDelete={() => onDelete(wp.id)} />
        </div>
      )}
    </div>
  );
}

export default function DeliveryMissionPanel({ waypoints, setWaypoints, roverPosition, roverHeading, onClose, portrait, size }) {
  // sortMode is purely a visual indicator for which button looks "active".
  // "By distance" is an action: it sorts waypoints once and writes that order
  // back into state. The list/route then stay put until the user re-clicks it.
  const [sortMode, setSortMode] = useState("manual");
  const [coordFormat, setCoordFormatState] = useState("DD");
  const [addForm, setAddForm] = useState({ name: "", lat: "", lon: "" });
  const [addError, setAddError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTileCache, setShowTileCache] = useState(false);
  const [centerForm, setCenterForm] = useState({ lat: "", lon: "", radiusKm: "2" });
  const [dlStatus, setDlStatus] = useState(null);
  const [dlPolling, setDlPolling] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(COORD_FORMAT_STORAGE_KEY) : null;
    if (saved && COORD_FORMATS[saved]) setCoordFormatState(saved);
  }, []);

  const setCoordFormat = (next) => {
    if (!COORD_FORMATS[next]) return;
    setCoordFormatState(next);
    if (typeof window !== "undefined") localStorage.setItem(COORD_FORMAT_STORAGE_KEY, next);
  };

  const fmt = COORD_FORMATS[coordFormat];

  const coordFormatSelector = (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, padding: "8px 10px", background: "#0d1117", border: "1px solid #1f2937", borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Coord format:</span>
        {Object.entries(COORD_FORMATS).map(([key, f]) => (
          <button
            key={key}
            onClick={() => setCoordFormat(key)}
            title={f.name}
            style={{
              padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${coordFormat === key ? "#1d4ed8" : "#374151"}`,
              background: coordFormat === key ? "#1d4ed8" : "#1f2937",
              color: coordFormat === key ? "white" : "#9ca3af",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ color: "#6b7280", fontSize: 10, lineHeight: 1.4 }}>
        <span style={{ color: "#9ca3af" }}>{fmt.name}</span>
        {fmt.hint && <span> — {fmt.hint}</span>}
        <div>e.g. lat <code style={{ color: "#cbd5e1" }}>{fmt.examplesLat[0]}</code>, lon <code style={{ color: "#cbd5e1" }}>{fmt.examplesLon[0]}</code></div>
      </div>
    </div>
  );

  const sortByDistance = useCallback(() => {
    if (!roverPosition) return;
    setWaypoints((prev) =>
      [...prev].sort((a, b) => euclideanMeters(roverPosition, a) - euclideanMeters(roverPosition, b))
    );
    setSortMode("distance");
  }, [roverPosition, setWaypoints]);

  const sortedWaypoints = waypoints;

  const nextWaypoint = sortedWaypoints[0] ?? null;
  const distToNext = nextWaypoint && roverPosition ? euclideanMeters(roverPosition, nextWaypoint) : null;
  const etaSeconds = distToNext !== null ? distToNext / MAX_SPEED_MPS : null;

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addWaypoint = () => {
    const lat = parseCoord(addForm.lat, { axis: "lat", format: coordFormat });
    const lon = parseCoord(addForm.lon, { axis: "lon", format: coordFormat });
    const name = addForm.name.trim() || `WP ${waypoints.length + 1}`;
    if (!lat.ok) { setAddError(`Lat: ${lat.error}`); return; }
    if (!lon.ok) { setAddError(`Lon: ${lon.error}`); return; }
    setWaypoints((prev) => [...prev, { id: Date.now(), name, latitude: lat.value, longitude: lon.value }]);
    setAddForm({ name: "", lat: "", lon: "" });
    setAddError("");
    setShowAddForm(false);
  };

  const deleteWaypoint = useCallback((id) => setWaypoints((prev) => prev.filter((wp) => wp.id !== id)), [setWaypoints]);

  const editWaypoint = useCallback((id, updates) => {
    setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, ...updates } : wp)));
  }, [setWaypoints]);

  const moveWaypoint = useCallback((id, dir) => {
    setWaypoints((prev) => {
      const i = prev.findIndex((wp) => wp.id === id);
      if (i === -1) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSortMode("manual");
  }, [setWaypoints]);

  // ── Tile download ────────────────────────────────────────────────────────────

  const startDownload = async (body) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/tiles/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) { setDlStatus({ error: data.error }); return; }
      setDlPolling(true);
    } catch (e) {
      setDlStatus({ error: String(e) });
    }
  };

  const downloadArea = async () => {
    let lat, lon;
    if (centerForm.lat || centerForm.lon) {
      const latP = parseCoord(centerForm.lat, { axis: "lat", format: coordFormat });
      const lonP = parseCoord(centerForm.lon, { axis: "lon", format: coordFormat });
      if (!latP.ok || !lonP.ok) {
        setDlStatus({ error: `Invalid center: ${latP.error || lonP.error}` });
        return;
      }
      lat = latP.value;
      lon = lonP.value;
    } else {
      lat = roverPosition?.latitude;
      lon = roverPosition?.longitude;
    }
    const r = parseFloat(centerForm.radiusKm) || 2;
    if (lat == null || lon == null) { setDlStatus({ error: "No coordinates — enter lat/lon or wait for GPS fix" }); return; }
    await startDownload({ center: { lat, lon }, radius_km: r, min_zoom: 12, max_zoom: 18 });
  };

  useEffect(() => {
    if (!dlPolling) return;
    const poll = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/tiles/download/status`);
        const data = await res.json();
        setDlStatus(data);
        if (!data.running) setDlPolling(false);
      } catch { setDlPolling(false); }
    };
    poll();
    const id = setInterval(poll, 600);
    return () => clearInterval(id);
  }, [dlPolling]);

  // ── Layout ───────────────────────────────────────────────────────────────────
  // Portrait: horizontal strip at bottom of screen
  // Landscape: vertical panel on the right

  const panelStyle = portrait
    ? { width: "100%", height: size ?? 340, flexDirection: "row" }
    : { width: size ?? 300, minWidth: 220, flexDirection: "column" };

  return (
    <div style={{
      background: "#111",
      display: "flex",
      overflow: "hidden",
      flexShrink: 0,
      ...panelStyle,
    }}>

      {portrait ? (
        // ── Portrait: two-column layout ─────────────────────────────────────
        <>
          {/* Left col: minimap + ETA */}
          <div style={{ width: 180, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 8px", borderRight: "1px solid #1f2937" }}>
            <MiniMapHUD roverHeading={roverHeading} roverPosition={roverPosition} nextWaypoint={nextWaypoint} size={130} />
            {nextWaypoint ? (
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ color: "#86efac", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ▶ {nextWaypoint.name}
                </div>
                {distToNext !== null && (
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                    {distToNext.toFixed(0)} m · {formatETA(etaSeconds)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "#374151", fontSize: 11, textAlign: "center" }}>No waypoints</div>
            )}
            {/* Close button at bottom of left col */}
            <button
              onClick={onClose}
              style={{ marginTop: "auto", ...actionBtn, background: "#1f2937", width: "100%", fontSize: 12 }}
            >
              ▼ Hide
            </button>
          </div>

          {/* Right col: scrollable waypoint list + controls */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            {/* Sort + action toolbar */}
            <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
              <button
                onClick={sortByDistance}
                disabled={!roverPosition}
                title={roverPosition ? "Reorder waypoints by current distance from rover" : "No rover fix"}
                style={{ ...actionBtn, flex: 1, background: sortMode === "distance" ? "#1d4ed8" : "#1f2937", fontSize: 12, opacity: roverPosition ? 1 : 0.5 }}
              >
                By distance
              </button>
              <button
                onClick={() => setSortMode("manual")}
                style={{ ...actionBtn, flex: 1, background: sortMode === "manual" ? "#1d4ed8" : "#1f2937", fontSize: 12 }}
              >
                Manual
              </button>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                style={{ ...actionBtn, background: showAddForm ? "#065f46" : "#1f2937", minWidth: 44 }}
                title="Add waypoint"
              >+</button>
              <button
                onClick={() => setShowTileCache((v) => !v)}
                style={{ ...actionBtn, background: showTileCache ? "#1e3a5f" : "#1f2937", minWidth: 44 }}
                title="Offline tile cache"
              >🗺</button>
            </div>

            {/* Add form (collapsible) */}
            {showAddForm && (
              <div style={{ padding: "8px 10px", borderBottom: "1px solid #1f2937", background: "#161616", flexShrink: 0 }}>
                {coordFormatSelector}
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ ...inputStyle, flex: 1 }} />
                  <input value={addForm.lat} onChange={(e) => setAddForm((f) => ({ ...f, lat: e.target.value }))} placeholder={`Lat (${fmt.placeholderLat})`} style={{ ...inputStyle, flex: 1 }} />
                  <input value={addForm.lon} onChange={(e) => setAddForm((f) => ({ ...f, lon: e.target.value }))} placeholder={`Lon (${fmt.placeholderLon})`} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={addWaypoint} style={{ ...actionBtn, background: "#065f46", minWidth: 52 }}>Add</button>
                </div>
                {addError && <div style={{ color: "#f87171", fontSize: 11 }}>{addError}</div>}
              </div>
            )}

            {/* Tile cache form (collapsible) */}
            {showTileCache && (
              <div style={{ padding: "8px 10px", borderBottom: "1px solid #1f2937", background: "#0d1117", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={centerForm.lat} onChange={(e) => setCenterForm((f) => ({ ...f, lat: e.target.value }))} placeholder={`Lat (${fmt.placeholderLat})`} style={{ ...inputStyle, flex: 1 }} />
                  <input value={centerForm.lon} onChange={(e) => setCenterForm((f) => ({ ...f, lon: e.target.value }))} placeholder={`Lon (${fmt.placeholderLon})`} style={{ ...inputStyle, flex: 1 }} />
                  <input value={centerForm.radiusKm} onChange={(e) => setCenterForm((f) => ({ ...f, radiusKm: e.target.value }))} placeholder="km" style={{ ...inputStyle, width: 48 }} />
                  <button onClick={downloadArea} disabled={dlStatus?.running} style={{ ...actionBtn, background: dlStatus?.running ? "#374151" : "#0f766e", minWidth: 70 }}>
                    {dlStatus?.running ? "…" : "Cache"}
                  </button>
                </div>
                {dlStatus && <DownloadStatus status={dlStatus} />}
              </div>
            )}

            {/* Waypoint list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {sortedWaypoints.length === 0 && (
                <div style={{ color: "#374151", fontSize: 12, textAlign: "center", paddingTop: 12 }}>
                  No waypoints — click the map or tap +
                </div>
              )}
              {sortedWaypoints.map((wp, idx) => (
                <WaypointRow key={wp.id} wp={wp} idx={idx} isNext={idx === 0}
                  onDelete={deleteWaypoint} onEdit={editWaypoint}
                  onMoveUp={() => moveWaypoint(wp.id, -1)} onMoveDown={() => moveWaypoint(wp.id, 1)}
                  canMoveUp={idx > 0} canMoveDown={idx < sortedWaypoints.length - 1}
                  roverPosition={roverPosition}
                  coordFormat={coordFormat}
                />
              ))}
              {waypoints.length > 0 && (
                <button onClick={() => setWaypoints([])} style={{ ...actionBtn, background: "#1f2937", border: "1px solid #374151", width: "100%", marginTop: 4, fontSize: 12 }}>
                  Clear all
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        // ── Landscape: vertical panel ────────────────────────────────────────
        <>
          {/* Header */}
          <div style={{ padding: "12px 14px", background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14, flex: 1 }}>Delivery Mission</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "4px 8px" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Minimap + ETA */}
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <MiniMapHUD roverHeading={roverHeading} roverPosition={roverPosition} nextWaypoint={nextWaypoint} size={170} />
              {nextWaypoint ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#86efac", fontSize: 13, fontWeight: 700 }}>▶ {nextWaypoint.name}</div>
                  {distToNext !== null && (
                    <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                      {distToNext.toFixed(0)} m · ETA {formatETA(etaSeconds)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#374151", fontSize: 12 }}>No waypoints set</div>
              )}
            </div>

            {/* Sort toggle */}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={sortByDistance} disabled={!roverPosition} style={{ ...actionBtn, flex: 1, background: sortMode === "distance" ? "#1d4ed8" : "#1f2937", opacity: roverPosition ? 1 : 0.5 }}>
                By distance
              </button>
              <button onClick={() => setSortMode("manual")} style={{ ...actionBtn, flex: 1, background: sortMode === "manual" ? "#1d4ed8" : "#1f2937" }}>
                Manual order
              </button>
            </div>

            {/* Waypoint list */}
            <div>
              {sortedWaypoints.length === 0 && (
                <div style={{ color: "#374151", fontSize: 12, textAlign: "center", padding: "10px 0" }}>
                  No waypoints — click the map or add below
                </div>
              )}
              {sortedWaypoints.map((wp, idx) => (
                <WaypointRow key={wp.id} wp={wp} idx={idx} isNext={idx === 0}
                  onDelete={deleteWaypoint} onEdit={editWaypoint}
                  onMoveUp={() => moveWaypoint(wp.id, -1)} onMoveDown={() => moveWaypoint(wp.id, 1)}
                  canMoveUp={idx > 0} canMoveDown={idx < sortedWaypoints.length - 1}
                  roverPosition={roverPosition}
                  coordFormat={coordFormat}
                />
              ))}
            </div>

            {/* Add waypoint */}
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px" }}>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                style={{ ...actionBtn, background: showAddForm ? "#065f46" : "#1f2937", width: "100%", marginBottom: showAddForm ? 8 : 0 }}
              >
                {showAddForm ? "▲ Cancel" : "+ Add Waypoint"}
              </button>
              {showAddForm && (
                <>
                  {coordFormatSelector}
                  <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name (optional)" style={{ ...inputStyle, width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input value={addForm.lat} onChange={(e) => setAddForm((f) => ({ ...f, lat: e.target.value }))} placeholder={`Lat (${fmt.placeholderLat})`} style={{ ...inputStyle, flex: 1 }} />
                    <input value={addForm.lon} onChange={(e) => setAddForm((f) => ({ ...f, lon: e.target.value }))} placeholder={`Lon (${fmt.placeholderLon})`} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  {addError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 6 }}>{addError}</div>}
                  <button onClick={addWaypoint} style={{ ...actionBtn, background: "#065f46", width: "100%" }}>Add Waypoint</button>
                  <div style={{ color: "#374151", fontSize: 11, marginTop: 6, textAlign: "center" }}>or click anywhere on the map</div>
                </>
              )}
            </div>

            {/* Clear all */}
            {waypoints.length > 0 && (
              <button onClick={() => setWaypoints([])} style={{ ...actionBtn, background: "#1f2937", border: "1px solid #374151", width: "100%" }}>
                Clear All Waypoints
              </button>
            )}

            {/* Tile cache */}
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px", marginBottom: 4 }}>
              <button
                onClick={() => setShowTileCache((v) => !v)}
                style={{ ...actionBtn, background: showTileCache ? "#1e3a5f" : "#1f2937", width: "100%", marginBottom: showTileCache ? 8 : 0 }}
              >
                {showTileCache ? "▲ Tile Cache" : "🗺 Offline Tile Cache"}
              </button>
              {showTileCache && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input value={centerForm.lat} onChange={(e) => setCenterForm((f) => ({ ...f, lat: e.target.value }))} placeholder={`Lat (${fmt.placeholderLat})`} style={{ ...inputStyle, flex: 1 }} />
                    <input value={centerForm.lon} onChange={(e) => setCenterForm((f) => ({ ...f, lon: e.target.value }))} placeholder={`Lon (${fmt.placeholderLon})`} style={{ ...inputStyle, flex: 1 }} />
                    <input value={centerForm.radiusKm} onChange={(e) => setCenterForm((f) => ({ ...f, radiusKm: e.target.value }))} placeholder="km" style={{ ...inputStyle, width: 48 }} />
                  </div>
                  <button
                    onClick={downloadArea}
                    disabled={dlStatus?.running}
                    style={{ ...actionBtn, width: "100%", background: dlStatus?.running ? "#374151" : "#0f766e" }}
                  >
                    {dlStatus?.running ? "Downloading…" : roverPosition && !centerForm.lat ? "Cache rover area" : "Cache this area"}
                  </button>
                  {dlStatus && <DownloadStatus status={dlStatus} />}
                </>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function DownloadStatus({ status }) {
  if (!status) return null;
  if (status.error) return <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>Error: {status.error}</div>;
  const pct = status.total ? Math.round(((status.downloaded + status.skipped) / status.total) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      {status.running ? (
        <>
          <div style={{ background: "#111827", borderRadius: 4, height: 6, marginBottom: 4, overflow: "hidden" }}>
            <div style={{ background: "#22c55e", height: "100%", width: `${pct}%`, transition: "width 0.3s", borderRadius: 4 }} />
          </div>
          <div style={{ color: "#9ca3af", fontSize: 11 }}>
            {status.downloaded + status.skipped} / {status.total} tiles ({status.downloaded} new)
          </div>
        </>
      ) : (
        <div style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>{status.message}</div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const actionBtn = {
  border: "none",
  borderRadius: 8,
  color: "white",
  cursor: "pointer",
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  minHeight: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const reorderBtn = {
  width: 28,
  height: 20,
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: 4,
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const inputStyle = {
  background: "#0d1117",
  border: "1px solid #374151",
  borderRadius: 6,
  color: "white",
  fontSize: 13,
  padding: "8px 10px",
  outline: "none",
  minHeight: 38,
  boxSizing: "border-box",
};
