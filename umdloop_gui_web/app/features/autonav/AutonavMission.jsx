"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useStopwatch from "../../hooks/useStopwatch";
import AutonavMap from "./AutonavMap";
import DetectionPanel from "./DetectionPanel";
import MissionControlPanel from "./MissionControlPanel";
import useMissionExecutive from "./useMissionExecutive";
import { arrivalBanner, haversineMeters, targetTypeMeta } from "./missionConstants";

const STORAGE_KEY = "autonav-targets";
const REMOVED_KEY = "autonav-removed";
const BANNER_MS = 9000;

function loadJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

let idCounter = 0;
function newTargetId() {
  idCounter += 1;
  // Stable, human-traceable, collision-resistant target_id for the node's store.
  return `gui-${Date.now().toString(36)}-${idCounter}`;
}

export default function AutonavMission() {
  const mission = useMissionExecutive();
  const timer = useStopwatch();
  const { start: startTimer } = timer;

  // Local lat/lon store — /waypoint_queue carries ENU only, so the GUI owns the
  // geographic coordinates (plan §Coordinates).
  const [mounted, setMounted] = useState(false);
  const [targets, setTargets] = useState({});
  // Targets the operator has removed locally. The node has no remove service,
  // so removal forgets the lat/lon and suppresses the entry even if the node
  // keeps echoing it on /waypoint_queue.
  const [removedIds, setRemovedIds] = useState([]);
  useEffect(() => {
    setMounted(true);
    setTargets(loadJson(STORAGE_KEY, {}));
    setRemovedIds(loadJson(REMOVED_KEY, []));
  }, []);
  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  }, [targets, mounted]);
  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(REMOVED_KEY, JSON.stringify(removedIds));
  }, [removedIds, mounted]);

  const removedSet = useMemo(() => new Set(removedIds), [removedIds]);

  // ── Cumulative distance (1.f.i) ────────────────────────────────────────────
  const [distanceM, setDistanceM] = useState(0);
  const lastPosRef = useRef(null);
  useEffect(() => {
    const pos = mission.roverPosition;
    if (!pos) return;
    const last = lastPosRef.current;
    lastPosRef.current = pos;
    if (!timer.running || !last) return;
    const d = haversineMeters(last, pos);
    // Ignore sub-metre GPS jitter and implausible jumps.
    if (d > 0.2 && d < 100) setDistanceM((v) => v + d);
  }, [mission.roverPosition, timer.running]);

  // ── Active target id (authoritative from nav_status, else queue ACTIVE) ─────
  const activeId = useMemo(() => {
    if (mission.navStatus?.active_target_id) return mission.navStatus.active_target_id;
    const active = mission.queue.find((q) => q.status === "ACTIVE");
    return active?.id ?? null;
  }, [mission.navStatus, mission.queue]);

  // ── Enriched queue: /waypoint_queue status + local lat/lon, plus any
  // locally-registered targets not yet echoed back on the queue. ─────────────
  const enrichedQueue = useMemo(() => {
    const byId = new Map();
    mission.queue.forEach((q) => {
      if (removedSet.has(q.id)) return;
      const local = targets[q.id] || {};
      byId.set(q.id, {
        id: q.id,
        label: local.label,
        lat: local.lat,
        lon: local.lon,
        type: local.type ?? q.type_code,
        tol: local.tol ?? q.tolerance,
        status: q.status,
      });
    });
    Object.entries(targets).forEach(([id, t]) => {
      if (!byId.has(id) && !removedSet.has(id)) byId.set(id, { id, ...t, status: "PENDING" });
    });
    return Array.from(byId.values());
  }, [mission.queue, targets, removedSet]);

  // ── Commands ───────────────────────────────────────────────────────────────
  const handleRegister = useCallback(
    (target, go) => {
      const id = newTargetId();
      setTargets((prev) => ({ ...prev, [id]: { ...target } }));
      const registered = mission.setTarget({ id, ...target });
      if (go) {
        startTimer();
        Promise.resolve(registered)
          .then(() => mission.navigateTo(id, false))
          .catch(() => {
            /* set_target failed — surfaced via connection status */
          });
      }
    },
    [mission, startTimer]
  );

  const handleGo = useCallback(
    (id) => {
      if (mission.goalActive) {
        const ok = window.confirm("A goal is already active. Going to this target will preempt it. Continue?");
        if (!ok) return;
      }
      startTimer();
      mission.navigateTo(id, false);
    },
    [mission, startTimer]
  );

  const handleReturn = useCallback(
    (id) => {
      startTimer();
      mission.navigateTo(id, true);
    },
    [mission, startTimer]
  );

  const handleRemove = useCallback(
    (id) => {
      // If the rover is actively driving to it, cancel the goal first so we
      // don't keep navigating to a target the operator just dropped.
      if (id === activeId && mission.goalActive) mission.abort();
      setTargets((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [activeId, mission]
  );

  // ── Arrival banner (auto-dismiss) ──────────────────────────────────────────
  const banner = arrivalBanner(mission.navStatus, mission.lastResult);
  const { clearLastResult } = mission;
  useEffect(() => {
    if (!mission.lastResult) return undefined;
    const t = window.setTimeout(() => clearLastResult(), BANNER_MS);
    return () => window.clearTimeout(t);
  }, [mission.lastResult, clearLastResult]);

  const connStatus = mission.status;

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      {/* Left: map + arrival banner overlay */}
      <div style={{ flex: 1.5, position: "relative", minWidth: 0 }}>
        <AutonavMap
          targets={enrichedQueue}
          activeId={activeId}
          roverPosition={mission.roverPosition}
          roverStatus={mission.roverStatus}
          roverHeading={mission.roverHeading}
          onAddPoint={({ lat, lon }) => {
            // Drop a quick GNSS target the operator can rename/retype in the form.
            const meta = targetTypeMeta(0);
            const id = newTargetId();
            setTargets((prev) => ({
              ...prev,
              [id]: { label: `Pin ${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, type: meta.value, tol: meta.tol },
            }));
            mission.setTarget({ id, label: "", lat, lon, type: meta.value, tol: meta.tol });
          }}
        />

        {banner.kind && (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: "50%",
              transform: "translateX(-50%)",
              minWidth: 320,
              maxWidth: "80%",
              padding: "16px 28px",
              borderRadius: 14,
              textAlign: "center",
              zIndex: 20,
              color: "white",
              background: banner.kind === "success" ? "rgba(5, 80, 40, 0.96)" : "rgba(120, 20, 20, 0.96)",
              border: `3px solid ${banner.kind === "success" ? "#22c55e" : "#ef4444"}`,
              boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
              animation: banner.kind === "success" ? "autonavBannerFlash 0.8s steps(1) 3" : undefined,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>
              {banner.kind === "success" ? "✓ " : "✗ "}
              {banner.title}
            </div>
            <div style={{ fontSize: 14, marginTop: 6, opacity: 0.9 }}>{banner.detail}</div>
            <button
              onClick={clearLastResult}
              style={{ marginTop: 10, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.4)", color: "white", borderRadius: 9999, padding: "4px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {connStatus !== "connected" && (
          <div
            style={{
              position: "absolute",
              top: 64,
              right: 12,
              zIndex: 15,
              background: "#7c2d12",
              color: "#fca5a5",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            rosbridge: {connStatus}
          </div>
        )}
      </div>

      {/* Right: detection (top) + control panel (bottom) */}
      <div style={{ width: 470, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid #333", minHeight: 0 }}>
        <div style={{ flex: "0 0 42%", minHeight: 0, borderBottom: "1px solid #333" }}>
          <DetectionPanel
            yoloDetections={mission.yoloDetections}
            yoloFound={mission.yoloFound}
            yoloLabel={mission.yoloLabel}
            yoloCenter={mission.yoloCenter}
            camInfo={mission.camInfo}
            navState={mission.navStatus?.state ?? null}
          />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MissionControlPanel
            connStatus={connStatus}
            navStatus={mission.navStatus}
            led={mission.led}
            navEnabled={mission.navEnabled}
            goalActive={mission.goalActive}
            queue={enrichedQueue}
            activeId={activeId}
            timer={timer}
            distanceM={distanceM}
            onRegister={handleRegister}
            onGo={handleGo}
            onReturn={handleReturn}
            onRemove={handleRemove}
            onSkip={mission.skip}
            onAbort={mission.abort}
            onTeleop={mission.teleop}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes autonavBannerFlash {
          0%,
          50% {
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.7), 0 6px 24px rgba(0, 0, 0, 0.6);
          }
          50.01%,
          100% {
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0), 0 6px 24px rgba(0, 0, 0, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
