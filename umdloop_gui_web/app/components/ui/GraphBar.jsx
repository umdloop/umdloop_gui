"use client";

/**
 * Reusable progress bar visualization component.
 * Renders a horizontal bar filled to a given percentage with a specified color.
 *
 * Props:
 * - value (number): fill percentage (0–100)
 * - color (string): CSS color for the filled portion
 * - height (string, optional): bar height (default: "8px")
 * - style (object, optional): additional styles applied to the outer container
 */
export default function GraphBar({ value, color, height, style }) {
  return (
    <div
      style={{
        height: height || "8px",
        background: "#252525",
        borderRadius: "var(--radius-pill, 999px)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}
