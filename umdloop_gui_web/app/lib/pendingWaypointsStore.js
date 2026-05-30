"use client";

// Module-level store for "pending waypoints" — shared between ControlPanel and
// MapView, which live in different React subtrees with no common parent.
// Uses useSyncExternalStore so subscribers re-render when the array reference
// changes (we always replace, never mutate).

import { useSyncExternalStore } from "react";

let _waypoints = [];
let _idCounter = 1;
const _listeners = new Set();

function notify() {
  for (const listener of _listeners) listener();
}

function subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function getSnapshot() {
  return _waypoints;
}

export function usePendingWaypoints() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addPendingWaypoint({ latitude, longitude, mode, objectClass }) {
  _waypoints = [..._waypoints, { id: _idCounter++, latitude, longitude, mode, objectClass }];
  notify();
}

export function removePendingWaypoint(id) {
  _waypoints = _waypoints.filter((wp) => wp.id !== id);
  notify();
}

export function setPendingWaypoints(updater) {
  _waypoints = typeof updater === "function" ? updater(_waypoints) : updater;
  notify();
}
