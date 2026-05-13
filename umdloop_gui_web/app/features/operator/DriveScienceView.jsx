"use client";

import React from "react";
import useStopwatch from "../../hooks/useStopwatch";

const scienceDrivePanels = [
  { title: "Wide-Angle Panorama Image", tone: "#2d4f62" },
  { title: "Stratigraphic Profile Image", tone: "#6a5234" },
  { title: "Close-Up High Res. Image", tone: "#5c3f2d" },
  { title: "GNSS Coords. / Elevation", tone: "#2d3b4f" },
];

export default function DriveScienceView() {
  const { formatted, running, start, pause, reset } = useStopwatch();

  return (
    <div style={{ padding: "12px", minHeight: 0, height: "100%", background: "#1a1a1a", overflow: "auto" }}>
      <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "16px", display: "grid", gridTemplateRows: "auto auto repeat(4, minmax(0, 1fr))", gap: "12px", minHeight: "100%" }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: "18px", textAlign: "center", letterSpacing: "0.03em" }}>
          Rover Operator (Driver)
        </div>
        <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "8px" }}>
          <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Stopwatch
          </div>
          <div style={{ color: "white", fontSize: "28px", fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
            {formatted}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
            <button
              onClick={running ? pause : start}
              style={{ borderRadius: "8px", border: "1px solid #555", background: running ? "#6d1111" : "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              style={{ borderRadius: "8px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
            >
              Reset
            </button>
          </div>
        </div>
        {scienceDrivePanels.map((panel) => (
          <div key={panel.title} style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
            <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {panel.title}
            </div>
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid #4a4a4a",
                background: `linear-gradient(180deg, ${panel.tone} 0%, #1b1b1b 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.82)",
                fontWeight: 800,
                fontSize: panel.title === "GNSS Coords. / Elevation" ? "18px" : "20px",
                textAlign: "center",
                padding: "12px",
                minHeight: 0,
              }}
            >
              {panel.title === "GNSS Coords. / Elevation" ? "GNSS Coords. / Elevation" : panel.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
