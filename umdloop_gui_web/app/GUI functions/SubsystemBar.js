"use client";

import React, { useState } from "react";

export default function SubsystemBar({ buttons, selected, setSelected, compact = false }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: compact ? "8px" : "12px",
        padding: compact ? "8px 12px" : "12px 20px",
        background: "#2b2b2b",
        borderBottom: "2px solid #1f1e1eff",
      }}
    >
      {buttons.map((label, idx) => {
        const buttonColor =
          hoveredButtonId === idx
            ? "#960303ff"
            : selected === label
              ? "#530000ff"
              : "#c90202ff";

        return (
          <div
            key={label}
            style={{
              background: buttonColor,
              border: "2px solid #360101ff",
              padding: compact ? "7px 16px" : "10px 32px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => setSelected(label)}
          >
            <span style={{ fontFamily: "Arial Black", color: "white", fontSize: compact ? "12px" : "14px" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
