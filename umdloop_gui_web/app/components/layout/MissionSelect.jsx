"use client";

import React, { useState } from "react";
import { MISSIONS } from "../../config/missions";

export default function MissionSelect({ onSelectMission }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1a1a1a",
        padding: "20px",
      }}
    >
      <img
        src="/umdloop-logo-white.png"
        alt="UMD Loop"
        style={{
          width: "50vw",
          height: "auto",
          marginBottom: "240px",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          maxWidth: "600px",
        }}
      >
        {MISSIONS.map((mission) => (
          <button
            key={mission.id}
            onClick={() => onSelectMission(mission)}
            onMouseEnter={() => setHoveredId(mission.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              background: hoveredId === mission.id ? "#3a3a3a" : "#2a2a2a",
              border: "2px solid #444",
              borderRadius: "10px",
              padding: "24px 32px",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
              borderColor: hoveredId === mission.id ? "#666" : "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "1.3rem",
                fontWeight: 500,
              }}
            >
              {mission.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
