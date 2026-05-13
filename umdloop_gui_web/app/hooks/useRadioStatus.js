"use client";

import { useEffect, useState } from "react";
import { getRadioStatus } from "../lib/api";

/**
 * Shared hook for radio status polling.
 * Extracted from OperationsWall.
 *
 * @param {Object} options
 * @param {number} [options.intervalMs=2000] - Polling interval in milliseconds
 * @returns {{ radioPercent: number, error: string }}
 */
export default function useRadioStatus({ intervalMs = 2000 } = {}) {
  const [radioPercent, setRadioPercent] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRadioStatus = async () => {
      try {
        const data = await getRadioStatus();
        if (cancelled) return;
        setError("");
        setRadioPercent(Math.max(0, Math.min(100, Number(data.quality_percent) || 0)));
      } catch (_) {
        if (cancelled) return;
        setError("Radio unreachable");
        setRadioPercent(0);
      }
    };

    loadRadioStatus();
    const id = setInterval(loadRadioStatus, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { radioPercent, error };
}
