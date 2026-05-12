"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ROVER_BACKEND_URL } from "../config";

/**
 * Hook that polls the Rover Backend health endpoint every 2 seconds.
 * Exposes:
 *   - isOffline: true when no successful response for > 3 seconds
 *   - secondsSinceLastResponse: elapsed seconds since last successful response (0 when online)
 */
export function useRadioStatus() {
  const [lastSuccessTime, setLastSuccessTime] = useState(() => Date.now());
  const [secondsSinceLastResponse, setSecondsSinceLastResponse] = useState(0);
  const lastSuccessRef = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${ROVER_BACKEND_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const now = Date.now();
        lastSuccessRef.current = now;
        setLastSuccessTime(now);
      }
    } catch {
      // Network error or timeout — do nothing, timer will catch it
    }
  }, []);

  // Poll every 2 seconds
  useEffect(() => {
    poll(); // initial poll
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  // Update elapsed seconds every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastSuccessRef.current) / 1000);
      setSecondsSinceLastResponse(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isOffline = secondsSinceLastResponse > 3;

  return { isOffline, secondsSinceLastResponse };
}
