"use client";

import React, { useState } from "react";
import { NAV_MODE_ICONS, NAV_MODES } from "../../config";

export default function NavigationBar({ selectedMode, setSelectedMode }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [selectedButton, setSelectedButton] = useState(NAV_MODES.indexOf(selectedMode));

  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px",
        padding: "8px 8px",
        background: "#3d3d3d",
      }}
    >
      {NAV_MODE_ICONS.map((mode, idx) => {
        const buttonColor =
          hoveredButtonId === idx
            ? "#353535ff"
            : selectedButton === idx
              ? "#262626ff"
              : "#3d3d3d";

        return (
          <button
            key={`${mode}-${idx}`}
            style={{
              background: buttonColor,
              border: "2px solid #1f1e1eff",
              borderRadius: "10px",
              padding: "8px 8px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              flex: 1,
              minWidth: "0",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => {
              setSelectedMode(NAV_MODES[idx]);
              setSelectedButton(idx);
            }}
          >
            {mode && <img src={`/${mode}`} alt={mode.replace(".png", "")} style={{ width: "30px", height: "30px" }} />}
            <span style={{ color: "white", fontSize: "10px", whiteSpace: "nowrap" }}>{NAV_MODES[idx]}</span>
          </button>
        );
      })}
    </nav>
  );
}
