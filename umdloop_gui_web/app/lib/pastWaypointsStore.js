"use client";

// Module-level store for past waypoints from /waypoint_manager/state.
// Starts polling when the first component subscribes, stops when the last
// unsubscribes, so there is exactly one fetch in flight regardless of how
// many components (ControlPanel, MapView) consume the data.

import { useSyncExternalStore } from "react";

const API = "http://127.0.0.1:5000/navigation/prev-waypoints";
const POLL_MS = 1000;

let _waypoints = [];
const _listeners = new Set();
let _intervalId = null;

function notify() {
  for (const l of _listeners) l();
}

async function fetchOnce() {
  try {
    const res = await fetch(API);
    const data = await res.json();
    if (data.ok) {
      _waypoints = data.waypoints;
      notify();
    }
  } catch {
    // backend unreachable — keep stale data
  }
}

function subscribe(listener) {
  _listeners.add(listener);
  if (_listeners.size === 1) {
    fetchOnce();
    _intervalId = setInterval(fetchOnce, POLL_MS);
  }
  return () => {
    _listeners.delete(listener);
    if (_listeners.size === 0 && _intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  };
}

function getSnapshot() {
  return _waypoints;
}

export function usePastWaypoints() {
  return useSyncExternalStore(subscribe, getSnapshot, () => _waypoints);
}

// Exposed so ControlPanel can optimistically re-sort without waiting for next poll
export function setPastWaypoints(updater) {
  _waypoints = typeof updater === "function" ? updater(_waypoints) : updater;
  notify();
}
