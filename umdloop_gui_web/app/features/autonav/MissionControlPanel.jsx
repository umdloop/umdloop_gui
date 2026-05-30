"use client";

import React, { useMemo, useState } from "react";
import { COORD_FORMATS, parseCoord } from "../../lib/coords";
import {
  DIST_AMBER_M,
  DIST_LIMIT_M,
  TIME_AMBER_MS,
  TIME_LIMIT_MS,
  TARGET_TYPE_LIST,
  ledLabel,
  isNavigating,
  isStoppedAfterArrival,
  limitColor,
  targetTypeMeta,
} from "./missionConstants";

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "2px solid #1f1e1e",
  background: "#3d3d3d",
  color: "white",
  outline: "none",
  boxSizing: "border-box",
  fontSize: 13,
};

function Btn({ onClick, disabled, children, color = "#1a3a5c", title, style }) {
  const active = !disabled;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "6px 12px",
        borderRadius: 9999,
        border: "2px solid #1f1e1e",
        background: active ? color : "#2a2a2a",
        color: active ? "white" : "#555",
        fontWeight: 700,
        fontSize: 12,
        cursor: active ? "pointer" : "default",
        transition: "background 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function fmtDist(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(0)} m`;
}

export default function MissionControlPanel({
  connStatus,
  navStatus,
  led,
  navEnabled,
  goalActive,
  queue = [],
  activeId = null,
  timer,
  distanceM = 0,
  onRegister,
  onGo,
  onReturn,
  onRemove,
  onSkip,
  onAbort,
  onTeleop,
}) {
  // Two-step inline confirm for the destructive remove action.
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  // ── Add-target form ────────────────────────────────────────────────────────
  const [label, setLabel] = useState("");
  const [format, setFormat] = useState("DD");
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [typeValue, setTypeValue] = useState(TARGET_TYPE_LIST[0].value);
  const [tolStr, setTolStr] = useState(String(TARGET_TYPE_LIST[0].tol));
  const [tolEdited, setTolEdited] = useState(false);
  const [formError, setFormError] = useState("");

  const fmt = COORD_FORMATS[format];

  const onTypeChange = (value) => {
    setTypeValue(value);
    if (!tolEdited) {
      const meta = targetTypeMeta(value);
      setTolStr(String(meta.tol));
    }
  };

  const buildTarget = () => {
    const latRes = parseCoord(latStr, { axis: "lat", format });
    if (!latRes.ok) {
      setFormError(`Latitude: ${latRes.error}`);
      return null;
    }
    const lonRes = parseCoord(lonStr, { axis: "lon", format });
    if (!lonRes.ok) {
      setFormError(`Longitude: ${lonRes.error}`);
      return null;
    }
    const tol = parseFloat(tolStr);
    if (!Number.isFinite(tol) || tol < 0) {
      setFormError("Tolerance must be a non-negative number.");
      return null;
    }
    setFormError("");
    const meta = targetTypeMeta(typeValue);
    return {
      label: label.trim() || `${meta.label} ${Date.now().toString().slice(-4)}`,
      lat: latRes.value,
      lon: lonRes.value,
      type: typeValue,
      tol,
    };
  };

  const resetForm = () => {
    setLabel("");
    setLatStr("");
    setLonStr("");
    setTolEdited(false);
    setTolStr(String(targetTypeMeta(typeValue).tol));
  };

  const handleRegister = (go) => {
    const target = buildTarget();
    if (!target) return;
    onRegister?.(target, go);
    resetForm();
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const state = navStatus?.state || (connStatus === "connected" ? "—" : connStatus);
  const navigating = isNavigating(state);
  const stoppedAfterArrival = isStoppedAfterArrival(state);
  const distToGoal = navStatus?.distance_to_goal_m;
  const ledInfo = useMemo(() => ledLabel(led), [led]);

  const elapsedMs = timer?.elapsedMs ?? 0;
  const timeColor = limitColor(elapsedMs, TIME_AMBER_MS, TIME_LIMIT_MS);
  const distColor = limitColor(distanceM, DIST_AMBER_M, DIST_LIMIT_M);

  const teleopOn = state === "TELEOP";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, color: "white", height: "100%", overflow: "auto" }}>
      {/* ── Mission HUD (1.f.i) ── */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "#2b2b2b", border: "2px solid #1f1e1e", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5 }}>MISSION TIME</div>
          <div style={{ fontSize: 26, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: timeColor }}>
            {timer?.formatted ?? "00:00.0"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>limit 30:00</div>
        </div>
        <div style={{ flex: 1, background: "#2b2b2b", border: "2px solid #1f1e1e", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5 }}>DISTANCE</div>
          <div style={{ fontSize: 26, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: distColor }}>
            {fmtDist(distanceM)}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>limit 2.00 km</div>
        </div>
      </div>

      {/* ── Status + LED ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <div style={{ flex: 1, background: "#2b2b2b", border: "2px solid #1f1e1e", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5 }}>NAV STATE</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{state}</div>
          {navigating && distToGoal !== undefined && (
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {fmtDist(distToGoal)} to goal
              {navStatus?.is_return ? " · returning" : ""}
            </div>
          )}
          {navEnabled !== null && (
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>nav {navEnabled ? "enabled" : "disabled"}</div>
          )}
        </div>
        <div style={{ width: 130, background: "#2b2b2b", border: "2px solid #1f1e1e", borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5 }}>LED</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: ledInfo.color,
                border: "2px solid #111",
                boxShadow: `0 0 8px ${ledInfo.color}`,
                animation: ledInfo.flashing ? "autonavBlink 0.5s steps(1) infinite" : undefined,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>{ledInfo.label}</span>
          </div>
        </div>
      </div>

      {/* ── Stopped-after-arrival notice (1.f.ix) ── */}
      {stoppedAfterArrival && (
        <div style={{ background: "#3a2a0a", border: "2px solid #b45309", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#fcd34d" }}>
          STOPPED — reprogram only. Driving is disabled until the next goal.
        </div>
      )}

      {/* ── Global controls ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Abort is the prominent emergency action — only meaningful mid-drive. */}
        <Btn
          onClick={onAbort}
          disabled={!navigating}
          color="#b91c1c"
          title={navigating ? "Cancel the active goal and stop the rover" : "Nothing to abort — the rover isn't navigating"}
          style={{ padding: "11px 12px", fontSize: 14, fontWeight: 900, width: "100%" }}
        >
          ■ Abort &amp; Stop
        </Btn>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Skip only applies to the target currently being driven to. */}
          <Btn
            onClick={onSkip}
            disabled={!navigating}
            color="#b45309"
            title={navigating ? "Give up on the current target and move on" : "Skip is only available while driving to a target"}
            style={{ flex: 1, padding: "10px 12px", fontSize: 13 }}
          >
            ⏭ Skip Target
          </Btn>

          {/* Single teleop toggle reflecting the live state. */}
          <Btn
            onClick={() => onTeleop?.(!teleopOn)}
            disabled={!teleopOn && stoppedAfterArrival}
            color={teleopOn ? "#1d4ed8" : "#374151"}
            title={
              teleopOn
                ? "Hand control back to autonomy (teleop off)"
                : stoppedAfterArrival
                ? "Cannot drive while stopped at a target (rule 1.f.ix)"
                : "Take manual control (teleop on)"
            }
            style={{ flex: 1, padding: "10px 12px", fontSize: 13 }}
          >
            🎮 Teleop: {teleopOn ? "ON" : "OFF"}
          </Btn>
        </div>
      </div>

      {/* ── Add target form ── */}
      <div style={{ background: "#2b2b2b", border: "2px solid #1f1e1e", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Add Target</div>

        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" style={inputStyle} />

        <div style={{ display: "flex", gap: 8 }}>
          <select value={typeValue} onChange={(e) => onTypeChange(Number(e.target.value))} style={{ ...inputStyle, flex: 1 }}>
            {TARGET_TYPE_LIST.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ ...inputStyle, width: 90 }}>
            {Object.keys(COORD_FORMATS).map((k) => (
              <option key={k} value={k}>
                {COORD_FORMATS[k].label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input value={latStr} onChange={(e) => setLatStr(e.target.value)} placeholder={`Lat (${fmt.placeholderLat})`} style={inputStyle} />
          <input value={lonStr} onChange={(e) => setLonStr(e.target.value)} placeholder={`Lon (${fmt.placeholderLon})`} style={inputStyle} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ opacity: 0.8, fontWeight: 700 }}>Tolerance (m)</span>
          <input
            value={tolStr}
            onChange={(e) => {
              setTolEdited(true);
              setTolStr(e.target.value);
            }}
            style={{ ...inputStyle, width: 90 }}
            inputMode="decimal"
          />
          <span style={{ opacity: 0.5, fontSize: 11 }}>auto: {targetTypeMeta(typeValue).tol} m</span>
        </label>

        {formError && <div style={{ color: "#ffb3b3", fontSize: 12, fontWeight: 700 }}>{formError}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleRegister(false)}
            style={{ flex: 1, padding: "10px", borderRadius: 9999, border: "2px solid #1f1e1e", background: "#1f4d1f", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Register
          </button>
          <button
            onClick={() => handleRegister(true)}
            style={{ flex: 1, padding: "10px", borderRadius: 9999, border: "2px solid #1f1e1e", background: "#530000", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Register &amp; Go
          </button>
        </div>
      </div>

      {/* ── Target queue ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>
          Targets <span style={{ opacity: 0.5, fontWeight: 600 }}>({queue.length})</span>
        </div>
        {queue.length === 0 && <div style={{ color: "#666", fontSize: 13 }}>No targets registered yet.</div>}
        {queue.map((t, idx) => {
          const meta = targetTypeMeta(t.type);
          const isActiveRow = t.id === activeId;
          const visited = t.status === "VISITED";
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: `2px solid ${isActiveRow ? "#3b82f6" : "#333"}`,
                background: "#383838",
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.label || t.id}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {meta.label}
                  {t.status ? ` · ${t.status}` : ""}
                  {Number.isFinite(t.lat) && ` · ${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}`}
                </div>
              </div>
              {confirmRemoveId === t.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5" }}>Remove?</span>
                  <Btn
                    onClick={() => {
                      onRemove?.(t.id);
                      setConfirmRemoveId(null);
                    }}
                    color="#7f1d1d"
                    title="Confirm remove"
                  >
                    Yes
                  </Btn>
                  <Btn onClick={() => setConfirmRemoveId(null)} color="#374151" title="Cancel">
                    No
                  </Btn>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn
                    onClick={() => onGo?.(t.id)}
                    color="#15803d"
                    title={goalActive ? "A goal is active — this will preempt it" : "Drive to this target"}
                  >
                    Go
                  </Btn>
                  <Btn onClick={() => onReturn?.(t.id)} disabled={!visited} color="#6d28d9" title="Return to this visited target">
                    Return
                  </Btn>
                  <button
                    onClick={() => setConfirmRemoveId(t.id)}
                    title="Remove target"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 9999,
                      border: "2px solid #1f1e1e",
                      background: "#3a3a3a",
                      color: "#f87171",
                      fontWeight: 900,
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes autonavBlink {
          0%,
          50% {
            opacity: 1;
          }
          50.01%,
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
}
