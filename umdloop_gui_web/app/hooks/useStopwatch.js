"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared stopwatch hook used by OperatorTab, ScienceMonitor, and TechnicianDashboard.
 * Returns elapsed time, running state, and control functions.
 */
export default function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;

    const intervalId = window.setInterval(() => {
      const startedAt = startRef.current ?? Date.now();
      setElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [running]);

  const start = () => {
    startRef.current = Date.now() - elapsedMs;
    setRunning(true);
  };

  const pause = () => {
    const startedAt = startRef.current ?? Date.now();
    setElapsedMs(Date.now() - startedAt);
    setRunning(false);
  };

  const reset = () => {
    startRef.current = null;
    setElapsedMs(0);
    setRunning(false);
  };

  const formatted = (() => {
    const totalTenths = Math.floor(elapsedMs / 100);
    const minutes = String(Math.floor(totalTenths / 600)).padStart(2, "0");
    const seconds = String(Math.floor((totalTenths % 600) / 10)).padStart(2, "0");
    const tenths = totalTenths % 10;
    return `${minutes}:${seconds}.${tenths}`;
  })();

  return { elapsedMs, running, start, pause, reset, formatted };
}
