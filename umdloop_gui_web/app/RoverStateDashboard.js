"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getApiBaseUrl } from "../config";

const fmt = (v, d = 3) => (v == null || isNaN(v) ? "—" : Number(v).toFixed(d));
const fmtAge = (ts) => {
  if (!ts) return "—";
  const s = (Date.now() - ts) / 1000;
  if (s < 1.5) return "live";
  return `${s.toFixed(1)}s ago`;
};
const isLive = (ts, maxMs = 2500) => ts && Date.now() - ts < maxMs;

const gpsFixLabel = (status) => {
  if (status == null) return "—";
  if (status < 0) return "No Fix";
  if (status === 0) return "GPS Fix";
  return "DGPS Fix";
};

const diagColor = (level) => level === 0 ? "#4ade80" : level === 1 ? "#facc15" : "#f87171";
const diagLabel = (level) => level === 0 ? "OK" : level === 1 ? "WARN" : level === 2 ? "ERR" : "STALE";

function StatusDot({ live }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: live ? "#4ade80" : "#444",
      boxShadow: live ? "0 0 6px #4ade80" : "none",
    }} />
  );
}

function Card({ title, live, children }) {
  return (
    <div style={{
      background: "#1e1e1e",
      border: `1px solid ${live ? "#2a3a2a" : "#282828"}`,
      borderRadius: 12, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid #2a2a2a", paddingBottom: 8,
      }}>
        
        <span style={{ color: "#bbb", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {title}
        </span>
        <StatusDot live={live} />
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, unit = "" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
      <span style={{ color: "#666", fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "white", fontSize: 13, fontWeight: 600, fontFamily: "monospace", textAlign: "right" }}>
        {value ?? "—"}{unit && <span style={{ color: "#444", fontSize: 11, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}


function VelBar({ label, value, max = 2 }) {
  const pct = Math.min(100, (Math.abs(value ?? 0) / max) * 100);
  const neg = (value ?? 0) < 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#666", fontSize: 12 }}>{label}</span>
        <span style={{ color: "white", fontSize: 12, fontFamily: "monospace" }}>
          {fmt(value, 3)} <span style={{ color: "#444", fontSize: 11 }}>m/s</span>
        </span>
      </div>
      <div style={{ height: 4, background: "#2a2a2a", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: neg ? "#f97316" : "#c90202",
          borderRadius: 9999, transition: "width 0.2s",
        }} />
      </div>
    </div>
  );
}


export default function RoverStateDashboard() {
  const [state,     setState]     = useState(null);
  const [apiStatus, setApiStatus] = useState("connecting");
  const [lastPoll,  setLastPoll]  = useState(null);
  const [errorMsg,  setErrorMsg]  = useState("");

  const poll = useCallback(async () => {
    try {
      const res  = await fetch(`${getApiBaseUrl()}/rover/state`);
      const data = await res.json();
      if (data.ok) {
        setState(data);
        setApiStatus("ok");
        setLastPoll(Date.now());
        setErrorMsg("");
      } else {
        setApiStatus("error");
        setErrorMsg(data.error || "Unknown error");
      }
    } catch (e) {
      setApiStatus("error");
      setErrorMsg("Flask backend unreachable");
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [poll]);

  const ok     = apiStatus === "ok";
  const gps    = state?.gps;
  const imu    = state?.imu;
  const imuf   = state?.imu_filtered;
  const odom   = state?.odom;
  const joints = state?.joints ?? [];
  const diags  = state?.diagnostics ?? [];
  const headingDeg = state?.heading ?? odom?.yaw_deg ?? null;

  return (
    <div style={{ padding: 14, color: "white", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: "0.05em" }}>ROVER STATE</h2>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: ok ? "#0a1f0a" : "#1f0a0a",
            border: `1px solid ${ok ? "#16a34a" : "#991b1b"}`,
            borderRadius: 9999, padding: "3px 10px",
          }}>
            <StatusDot live={ok} />
            <span style={{ fontSize: 11, fontWeight: 700, color: ok ? "#4ade80" : "#f87171" }}>
              {ok ? "FLASK API CONNECTED" : errorMsg || "CONNECTING…"}
            </span>
          </div>
        </div>
        <span style={{ color: "#444", fontSize: 10, fontFamily: "monospace" }}>polled {fmtAge(lastPoll)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>

        <Card title="Nav Mode" live={!!state?.nav_mode}>
          <Row label="Mode" value={state?.nav_mode ?? "—"} />
        </Card>

        <Card title="GPS" live={!!gps}>
          <Row label="Fix"       value={gpsFixLabel(gps?.status)} />
          <Row label="Latitude"  value={fmt(gps?.latitude,  7)} unit="°" />
          <Row label="Longitude" value={fmt(gps?.longitude, 7)} unit="°" />
          <Row label="Altitude"  value={fmt(gps?.altitude,  2)} unit="m" />
        </Card>

        <Card title="Heading" live={headingDeg != null}>
          <Row label="Heading" value={headingDeg != null ? `${(((headingDeg % 360) + 360) % 360).toFixed(1)}°` : "—"} />
          <Row label="Source"  value={state?.heading != null ? "/heading" : "odom yaw"} />
        </Card>

        <Card title="Odometry" live={!!odom}>
          <Row label="X"     value={fmt(odom?.x)}            unit="m" />
          <Row label="Y"     value={fmt(odom?.y)}            unit="m" />
          <Row label="Z"     value={fmt(odom?.z)}            unit="m" />
          <Row label="Roll"  value={fmt(odom?.roll_deg,  1)} unit="°" />
          <Row label="Pitch" value={fmt(odom?.pitch_deg, 1)} unit="°" />
          <Row label="Yaw"   value={fmt(odom?.yaw_deg,   1)} unit="°" />
        </Card>

        <Card title="Velocity" live={!!odom}>
          <VelBar label="Linear X" value={odom?.linear_x} />
          <VelBar label="Linear Y" value={odom?.linear_y} />
          <Row    label="Speed"     value={fmt(odom?.linear_speed, 3)} unit="m/s" />
          <Row    label="Angular Z" value={fmt(odom?.angular_z,    3)} unit="rad/s" />
        </Card>

        <Card title="IMU (filtered)" live={!!imuf}>
          <Row label="Roll"    value={fmt(imuf?.roll_deg,  1)} unit="°" />
          <Row label="Pitch"   value={fmt(imuf?.pitch_deg, 1)} unit="°" />
          <Row label="Yaw"     value={fmt(imuf?.yaw_deg,   1)} unit="°" />
          <Row label="Accel X" value={fmt(imuf?.accel_x)}     unit="m/s²" />
          <Row label="Accel Y" value={fmt(imuf?.accel_y)}     unit="m/s²" />
          <Row label="Accel Z" value={fmt(imuf?.accel_z)}     unit="m/s²" />
        </Card>

        <Card title="IMU (raw)" live={!!imu}>
          <Row label="Roll"  value={fmt(imu?.roll_deg,  1)} unit="°" />
          <Row label="Pitch" value={fmt(imu?.pitch_deg, 1)} unit="°" />
          <Row label="Yaw"   value={fmt(imu?.yaw_deg,   1)} unit="°" />
          <Row label="ω X"   value={fmt(imu?.gyro_x)}      unit="rad/s" />
          <Row label="ω Y"   value={fmt(imu?.gyro_y)}      unit="rad/s" />
          <Row label="ω Z"   value={fmt(imu?.gyro_z)}      unit="rad/s" />
        </Card>

        <Card title="Joint States" live={joints.length > 0}>
          {joints.length > 0 ? (
            joints.slice(0, 6).map((j) => (
              <Row key={j.name} label={j.name.replace(/_joint$/, "").replace(/_/g, " ")} value={fmt(j.velocity, 3)} unit="rad/s" />
            ))
          ) : (
            <span style={{ color: "#444", fontSize: 12 }}>Waiting for /joint_states…</span>
          )}
        </Card>

        <Card title="Diagnostics" live={diags.length > 0}>
          {diags.length === 0 ? (
            <span style={{ color: "#444", fontSize: 12 }}>Waiting for /diagnostics…</span>
          ) : (
            <>
              {diags.slice(0, 10).map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#777", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{d.name}</span>
                  <span style={{ color: diagColor(d.level), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{diagLabel(d.level)}</span>
                </div>
              ))}
              {diags.length > 10 && <span style={{ color: "#444", fontSize: 11 }}>+{diags.length - 10} more</span>}
            </>
          )}
        </Card>

      </div>
    </div>
  );
}
