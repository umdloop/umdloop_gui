"use client";

import { useEffect, useState } from "react";
import { getObjectDetectionStatus, startObjectDetection, stopObjectDetection } from "../lib/api";

/**
 * Shared hook for object detection polling logic.
 * Extracted from Navigation.js.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether polling is active (e.g., when "Object Detection" tab is selected)
 * @param {number} [options.intervalMs=1000] - Polling interval in milliseconds
 * @returns {{ running: boolean, pid: number|null, error: string, fetchStatus: function, startDetection: function, stopDetection: function }}
 */
export default function useObjectDetection({ enabled = false, intervalMs = 1000 } = {}) {
  const [running, setRunning] = useState(false);
  const [pid, setPid] = useState(null);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      setError("");
      const data = await getObjectDetectionStatus();
      setRunning(Boolean(data.running));
      setPid(data.pid ?? null);
    } catch (_) {
      setError("Backend unreachable");
      setRunning(false);
      setPid(null);
    }
  };

  const startDetection = async () => {
    try {
      setError("");
      await startObjectDetection();
      await fetchStatus();
    } catch (_) {
      setError("Failed to start");
    }
  };

  const stopDetection = async () => {
    try {
      setError("");
      await stopObjectDetection();
      await fetchStatus();
    } catch (_) {
      setError("Failed to stop");
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;

    fetchStatus();
    const id = setInterval(fetchStatus, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  useEffect(() => {
    if (!enabled) return;
    startDetection();
  }, [enabled]);

  return { running, pid, error, fetchStatus, startDetection, stopDetection };
}
