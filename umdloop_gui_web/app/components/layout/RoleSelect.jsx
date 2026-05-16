"use client";

import React, { useState } from "react";

export default function RoleSelect({ mission, onSelectRole, onBack }) {
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
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "8px 16px",
          cursor: "pointer",
          color: "#ccc",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#3a3a3a";
          e.currentTarget.style.borderColor = "#666";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#2a2a2a";
          e.currentTarget.style.borderColor = "#444";
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>←</span> Back to Missions
      </button>

      <img
        src="/umdloop-logo-white.png"
        alt="UMD Loop"
        style={{
          width: "50vw",
          height: "auto",
          marginBottom: "180px",
        }}
      />

      <h1
        style={{
          color: "#ffffff",
          fontSize: "1.8rem",
          marginBottom: "8px",
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}
      >
        {mission.name}
      </h1>

      <p
        style={{
          color: "#888",
          fontSize: "1rem",
          marginBottom: "36px",
        }}
      >
        Select your role
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          maxWidth: "600px",
        }}
      >
        {mission.roles.map((role, idx) => (
          <button
            key={role.id}
            onClick={() => onSelectRole(role)}
            onMouseEnter={() => setHoveredId(role.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              background: hoveredId === role.id ? "#3a3a3a" : "#2a2a2a",
              border: "2px solid #444",
              borderRadius: "10px",
              padding: "24px 32px",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
              borderColor: hoveredId === role.id ? "#666" : "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  color: "#666",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  minWidth: "50px",
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "1.2rem",
                  fontWeight: 500,
                }}
              >
                {role.name}
              </span>
            </div>
            <span style={{ color: "#888", fontSize: "1rem" }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
