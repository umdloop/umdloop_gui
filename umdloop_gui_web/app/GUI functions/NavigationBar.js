"use client";

import React, { useState } from "react";
import { MODE_ICONS, MODES } from "./pageConstants";

export default function NavigationBar({ selectedMode, setSelectedMode }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [selectedButton, setSelectedButton] = useState(MODES.indexOf(selectedMode));

  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "6px",
        padding: "12px 8px",
        background: "#3d3d3d",
      }}
    >
      {MODE_ICONS.map((mode, idx) => {
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
              padding: "12px 8px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              flex: 1,
              minWidth: "0",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => {
              setSelectedMode(MODES[idx]);
              setSelectedButton(idx);
            }}
          >
            <img src={`/${mode}`} alt={mode.replace(".png", "")} style={{ width: "36px", height: "36px" }} />
            <span style={{ color: "white", fontSize: "10px", whiteSpace: "nowrap" }}>{MODES[idx]}</span>
          </button>
        );
      })}
    </nav>
  );
}
