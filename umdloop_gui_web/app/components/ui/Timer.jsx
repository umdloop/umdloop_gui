"use client";

import useStopwatch from "../../hooks/useStopwatch";

/**
 * Stopwatch/countdown display component using the shared useStopwatch hook.
 * Renders the formatted time and Start/Pause/Reset controls.
 *
 * Props:
 * - label (string, optional): header label (default: "Stopwatch")
 * - columns (number, optional): number of button columns (default: 2)
 * - stopwatch (object, optional): an external useStopwatch() instance.
 *   If not provided, the component creates its own internal stopwatch.
 */
export default function Timer({ label, columns, stopwatch: externalStopwatch }) {
  const internalStopwatch = useStopwatch();
  const sw = externalStopwatch || internalStopwatch;

  const buttonColumns = columns || 2;

  return (
    <div
      style={{
        border: "2px solid var(--color-border-primary, #4a4a4a)",
        borderRadius: "var(--radius-md, 10px)",
        background: "var(--color-surface-elevated, #262626)",
        padding: "10px 12px",
        display: "grid",
        gap: "8px",
      }}
    >
      <div
        style={{
          color: "var(--color-text-secondary, #d9d9d9)",
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label || "Stopwatch"}
      </div>
      <div
        style={{
          color: "var(--color-text-primary, #ffffff)",
          fontSize: "28px",
          fontWeight: 900,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {sw.formatted}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${buttonColumns}, minmax(0, 1fr))`,
          gap: "8px",
        }}
      >
        <button
          onClick={sw.running ? sw.pause : sw.start}
          style={{
            borderRadius: "var(--radius-sm, 8px)",
            border: "1px solid #555",
            background: sw.running
              ? "var(--color-accent-danger-dark, #6d1111)"
              : "#303030",
            color: "var(--color-text-primary, #ffffff)",
            cursor: "pointer",
            fontWeight: 700,
            padding: "6px 10px",
          }}
        >
          {sw.running ? "Pause" : "Start"}
        </button>
        <button
          onClick={sw.reset}
          style={{
            borderRadius: "var(--radius-sm, 8px)",
            border: "1px solid #555",
            background: "#303030",
            color: "var(--color-text-primary, #ffffff)",
            cursor: "pointer",
            fontWeight: 700,
            padding: "6px 10px",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
