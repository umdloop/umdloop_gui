"use client";

import React, { useState, useRef } from "react";
import { sendPathPlan } from "../../lib/api";
import { getApiBaseUrl } from "../../config/environment";
import {
  usePendingWaypoints,
  addPendingWaypoint,
  removePendingWaypoint,
  setPendingWaypoints,
} from "../../lib/pendingWaypointsStore";
import { usePastWaypoints, setPastWaypoints as storeSortPrev } from "../../lib/pastWaypointsStore";

const MODES = ["GNSS", "Object Detection", "Aruco Tag"];

const MODE_COLORS = {
  "GNSS": "#1d4ed8",
  "Object Detection": "#7c3aed",
  "Aruco Tag": "#b45309",
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function flatEarthDist(aLat, aLon, bLat, bLon) {
  const dLat = aLat - bLat;
  const dLon = (aLon - bLon) * Math.cos((bLat * Math.PI) / 180);
  return dLat * dLat + dLon * dLon;
}

async function fetchRoverPos() {
  const res = await fetch(`${getApiBaseUrl()}/navigation/rover-position`);
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionPanel({ children, style }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "14px",
        border: "2px solid #1f1e1eff",
        background: "#2b2b2b",
        color: "white",
        width: "340px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function WaypointRow({ number, latitude, longitude, mode, isSelected, onSelect, onRemove }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: `2px solid ${isSelected ? "#4ade80" : "#333"}`,
        background: isSelected ? "#1a3322" : "#383838",
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
      }}
    >
      <span style={{ fontWeight: 900, fontSize: 14, minWidth: 20, color: "#aaa" }}>
        {number}.
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5" }}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
        {mode && (
          <div style={{ marginTop: 3 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 6,
                background: MODE_COLORS[mode] ?? "#555",
                color: "white",
              }}
            >
              {mode}
            </span>
          </div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px 4px",
            flexShrink: 0,
          }}
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

function PanelHeader({ title, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div style={{ display: "flex", gap: 8 }}>{children}</div>
    </div>
  );
}

function SmallButton({ onClick, disabled, children, color = "#1a3a5c" }) {
  const active = !disabled;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 13px",
        borderRadius: "9999px",
        border: "2px solid #1f1e1eff",
        background: active ? color : "#2a2a2a",
        color: active ? "white" : "#555",
        fontWeight: 700,
        fontSize: "12px",
        cursor: active ? "pointer" : "default",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function NavigateButton({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 4,
        width: "100%",
        padding: "12px 16px",
        borderRadius: "9999px",
        border: "2px solid #1f1e1eff",
        background: !disabled ? "#530000ff" : "#2a2a2a",
        color: !disabled ? "white" : "#555",
        fontWeight: 900,
        fontSize: "15px",
        cursor: !disabled ? "pointer" : "default",
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function WaypointList({ waypoints, selectedIds, onToggle, onRemove, emptyText }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60, maxHeight: 240, overflowY: "auto" }}>
      {waypoints.length === 0 && (
        <div style={{ color: "#666", fontSize: 13, padding: "8px 0" }}>{emptyText}</div>
      )}
      {waypoints.map((wp, idx) => (
        <WaypointRow
          key={wp.id}
          number={idx + 1}
          latitude={wp.latitude}
          longitude={wp.longitude}
          mode={wp.mode}
          isSelected={selectedIds.has(wp.id)}
          onSelect={() => onToggle(wp.id)}
          onRemove={onRemove ? () => onRemove(wp.id) : null}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ControlPanel() {
  // ── Control Panel state ───────────────────────────────────────────────────
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [navMode, setNavMode] = useState("GNSS");
  const [addError, setAddError] = useState("");

  // ── Pending Waypoints state ───────────────────────────────────────────────
  const pendingWaypoints = usePendingWaypoints();
  const [selectedPendingIds, setSelectedPendingIds] = useState(() => new Set());
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [isSortingPending, setIsSortingPending] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const [queueError, setQueueError] = useState("");
  const cancelledRef = useRef(false);

  // ── Previous Waypoints state ──────────────────────────────────────────────
  const prevWaypoints = usePastWaypoints();
  const [selectedPrevId, setSelectedPrevId] = useState(null);
  const [isPrevNavigating, setIsPrevNavigating] = useState(false);
  const [isSortingPrev, setIsSortingPrev] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [prevStatus, setPrevStatus] = useState("");
  const [prevError, setPrevError] = useState("");

  // ── Handlers: Control Panel ───────────────────────────────────────────────

  const onAdd = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setAddError("Enter valid latitude and longitude before adding.");
      return;
    }
    setAddError("");
    addPendingWaypoint({ latitude: lat, longitude: lon, mode: navMode });
    setLatitude("");
    setLongitude("");
  };

  // ── Handlers: Pending Waypoints ───────────────────────────────────────────

  const onRemovePending = (id) => {
    removePendingWaypoint(id);
    setSelectedPendingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const togglePendingSelection = (id) => {
    if (isQueueRunning) return;
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    if (isQueueRunning) return;
    setSelectedPendingIds(new Set(pendingWaypoints.map((w) => w.id)));
  };

  const clearPendingSelection = () => setSelectedPendingIds(new Set());

  const onSortPending = async () => {
    if (pendingWaypoints.length < 2) return;
    setIsSortingPending(true);
    setQueueError("");
    try {
      const data = await fetchRoverPos();
      if (!data.fix) { setQueueError("No GPS fix — cannot sort."); return; }
      const { latitude: rLat, longitude: rLon } = data;
      setPendingWaypoints((prev) =>
        [...prev].sort((a, b) =>
          flatEarthDist(a.latitude, a.longitude, rLat, rLon) -
          flatEarthDist(b.latitude, b.longitude, rLat, rLon)
        )
      );
    } catch {
      setQueueError("Backend unreachable — cannot sort.");
    } finally {
      setIsSortingPending(false);
    }
  };

  const startQueue = async () => {
    // Snapshot selected waypoints in their current list order
    const queue = pendingWaypoints.filter((wp) => selectedPendingIds.has(wp.id));
    if (queue.length === 0) return;

    setSelectedPendingIds(new Set());
    cancelledRef.current = false;
    setIsQueueRunning(true);
    setQueueError("");
    setQueueStatus(`Starting queue (${queue.length} waypoint${queue.length > 1 ? "s" : ""})…`);

    for (let i = 0; i < queue.length; i++) {
      if (cancelledRef.current) {
        setQueueStatus("Queue cancelled.");
        setIsQueueRunning(false);
        cancelledRef.current = false;
        return;
      }

      const wp = queue[i];
      setQueueStatus(`Navigating ${i + 1} / ${queue.length}…`);

      try {
        const data = await sendPathPlan({
          latitude: wp.latitude,
          longitude: wp.longitude,
          positionTolerance: 0.0,
          mode: wp.mode,
        });

        if (data.ok === false) {
          setQueueError(`WP ${i + 1} failed: ${data.error || data.message || "Navigation failed"}`);
          setQueueStatus("");
          setIsQueueRunning(false);
          return;
        }

        if (data.success) removePendingWaypoint(wp.id);
      } catch {
        setQueueError(`WP ${i + 1}: Backend unreachable`);
        setQueueStatus("");
        setIsQueueRunning(false);
        return;
      }
    }

    setQueueStatus(`Done — ${queue.length} waypoint${queue.length > 1 ? "s" : ""} reached.`);
    setIsQueueRunning(false);
  };

  const cancelQueue = () => { cancelledRef.current = true; };

  // ── Handlers: Previous Waypoints ─────────────────────────────────────────

  const onSortPrev = async () => {
    if (prevWaypoints.length < 2) return;
    setIsSortingPrev(true);
    setPrevError("");
    try {
      const data = await fetchRoverPos();
      if (!data.fix) { setPrevError("No GPS fix — cannot sort."); return; }
      const { latitude: rLat, longitude: rLon } = data;
      storeSortPrev((prev) =>
        [...prev].sort((a, b) =>
          flatEarthDist(a.latitude, a.longitude, rLat, rLon) -
          flatEarthDist(b.latitude, b.longitude, rLat, rLon)
        )
      );
    } catch {
      setPrevError("Backend unreachable — cannot sort.");
    } finally {
      setIsSortingPrev(false);
    }
  };

  const onClearPrev = async () => {
    setIsClearing(true);
    setPrevError("");
    setPrevStatus("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/navigation/clear-waypoints`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setPrevStatus(data.message || "Waypoints cleared");
        setSelectedPrevId(null);
      } else {
        setPrevError(data.message || "Clear failed");
      }
    } catch {
      setPrevError("Backend unreachable");
    } finally {
      setIsClearing(false);
    }
  };

  const onNavigatePrev = async () => {
    if (selectedPrevId == null) return;
    setPrevError("");
    setPrevStatus("Sending…");
    setIsPrevNavigating(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/navigation/navigate-to-waypoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoint_id: selectedPrevId }),
      });
      const data = await res.json();
      if (data.ok === false) {
        setPrevStatus("");
        setPrevError(data.error || "Navigation failed");
      } else {
        setPrevStatus(data.message || "Request sent");
      }
    } catch {
      setPrevStatus("");
      setPrevError("Backend unreachable");
    } finally {
      setIsPrevNavigating(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const numSelected = selectedPendingIds.size;
  const selectedPrevIdx = prevWaypoints.findIndex((w) => w.id === selectedPrevId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>

      {/* ── Control Panel ── */}
      <SectionPanel>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Control Panel</h2>

        <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Latitude</label>
        <input
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          placeholder="e.g. 38.4239116"
          style={inputStyle}
        />

        <label style={{ fontWeight: 800, display: "block", margin: "12px 0 6px" }}>Longitude</label>
        <input
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          placeholder="e.g. -110.7849055"
          style={inputStyle}
        />

        <div style={{ marginTop: 4 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Mode</div>
          {MODES.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "12px",
                border: "2px solid #1f1e1eff",
                background: navMode === opt ? "#262626ff" : "#3d3d3d",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              <input
                type="radio"
                name="navMode"
                value={opt}
                checked={navMode === opt}
                onChange={() => setNavMode(opt)}
                style={{ transform: "scale(1.2)" }}
              />
              <span style={{ fontWeight: 800 }}>{opt}</span>
            </label>
          ))}
        </div>

        <button
          onClick={onAdd}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: "9999px",
            border: "2px solid #1f1e1eff",
            background: "#1f4d1f",
            color: "white",
            fontWeight: 900,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          + Add Waypoint
        </button>

        {addError && (
          <div style={{ color: "#ffb3b3", fontWeight: 700, fontSize: 13 }}>{addError}</div>
        )}
      </SectionPanel>

      {/* ── Pending Waypoints ── */}
      <SectionPanel>
        <PanelHeader title="Pending Waypoints">
          <SmallButton
            onClick={onSortPending}
            disabled={pendingWaypoints.length < 2 || isSortingPending || isQueueRunning}
          >
            {isSortingPending ? "Sorting…" : "Sort by Distance"}
          </SmallButton>
          <SmallButton
            onClick={numSelected === pendingWaypoints.length ? clearPendingSelection : selectAllPending}
            disabled={pendingWaypoints.length === 0 || isQueueRunning}
          >
            {numSelected === pendingWaypoints.length && pendingWaypoints.length > 0 ? "Deselect All" : "Select All"}
          </SmallButton>
        </PanelHeader>

        {numSelected > 0 && !isQueueRunning && (
          <div style={{ fontSize: 12, color: "#aaa" }}>
            {numSelected} of {pendingWaypoints.length} selected — will navigate in list order
          </div>
        )}

        <WaypointList
          waypoints={pendingWaypoints}
          selectedIds={selectedPendingIds}
          onToggle={togglePendingSelection}
          onRemove={isQueueRunning ? null : onRemovePending}
          emptyText="No waypoints added yet."
        />

        {isQueueRunning ? (
          <NavigateButton
            onClick={cancelQueue}
            disabled={false}
            label="Cancel Queue"
          />
        ) : (
          <NavigateButton
            onClick={startQueue}
            disabled={numSelected === 0}
            label={numSelected > 0 ? `Navigate Selected (${numSelected})` : "Navigate"}
          />
        )}

        {queueStatus && (
          <div style={{ color: "#d8d8d8", fontWeight: 700, fontSize: 13 }}>{queueStatus}</div>
        )}
        {queueError && (
          <div style={{ color: "#ffb3b3", fontWeight: 700, fontSize: 13 }}>{queueError}</div>
        )}
      </SectionPanel>

      {/* ── Previous Waypoints ── */}
      <SectionPanel>
        <PanelHeader title="Previous Waypoints">
          <SmallButton
            onClick={onSortPrev}
            disabled={prevWaypoints.length < 2 || isSortingPrev}
          >
            {isSortingPrev ? "Sorting…" : "Sort by Distance"}
          </SmallButton>
          <SmallButton
            onClick={onClearPrev}
            disabled={prevWaypoints.length === 0 || isClearing}
            color="#7f1d1d"
          >
            {isClearing ? "Clearing…" : "Clear"}
          </SmallButton>
        </PanelHeader>

        <WaypointList
          waypoints={prevWaypoints}
          selectedIds={new Set(selectedPrevId != null ? [selectedPrevId] : [])}
          onToggle={(id) => setSelectedPrevId((prev) => (prev === id ? null : id))}
          onRemove={null}
          emptyText="No previous waypoints."
        />

        <NavigateButton
          onClick={onNavigatePrev}
          disabled={selectedPrevId == null || isPrevNavigating}
          label={
            isPrevNavigating
              ? "Navigating…"
              : selectedPrevId != null
              ? `Navigate to #${selectedPrevIdx + 1}`
              : "Navigate"
          }
        />

        {prevStatus && (
          <div style={{ color: "#d8d8d8", fontWeight: 700, fontSize: 13 }}>{prevStatus}</div>
        )}
        {prevError && (
          <div style={{ color: "#ffb3b3", fontWeight: 700, fontSize: 13 }}>{prevError}</div>
        )}
      </SectionPanel>

    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "2px solid #1f1e1eff",
  background: "#3d3d3d",
  color: "white",
  outline: "none",
  boxSizing: "border-box",
};
