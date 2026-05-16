"use client";

import React from "react";

export default function MissionClock({
  hours,
  minutes,
  seconds,
  inputHours,
  inputMinutes,
  inputSeconds,
  setInputHours,
  setInputMinutes,
  setInputSeconds,
  remainingSeconds,
  setTimerRunning,
  configuredSeconds,
  setRemainingSeconds,
  applyTimer,
  missionId,
  extensionUsed,
  onAddExtension,
  onUndoExtension,
}) {
  const isDelivery = missionId === "delivery";

  return (
    <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
      <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "8px", fontWeight: 800 }}>Mission Clock</div>
      <div style={{ fontSize: "28px", fontWeight: 900, color: "white", letterSpacing: "1px" }}>{hours}:{minutes}:{seconds}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "6px", marginTop: "10px" }}>
        <input value={inputHours} onChange={(e) => setInputHours(e.target.value)} placeholder="HH" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
        <input value={inputMinutes} onChange={(e) => setInputMinutes(e.target.value)} placeholder="MM" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
        <input value={inputSeconds} onChange={(e) => setInputSeconds(e.target.value)} placeholder="SS" style={{ padding: "6px", borderRadius: "6px", border: "1px solid #555", background: "#2a2a2a", color: "white", fontSize: "18px", fontWeight: 700 }} />
        <button onClick={applyTimer} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #5a5a5a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Set</button>
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
        <button onClick={() => setTimerRunning(true)} disabled={remainingSeconds <= 0} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2f6b2f", background: remainingSeconds > 0 ? "#1f7a1f" : "#3a3a3a", color: "white", fontWeight: 700, cursor: remainingSeconds > 0 ? "pointer" : "not-allowed", fontSize: "18px" }}>Start</button>
        <button onClick={() => setTimerRunning(false)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Pause</button>
        <button onClick={() => { setTimerRunning(false); setRemainingSeconds(configuredSeconds); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Reset</button>
      </div>

      {isDelivery && (
        <div style={{ display: "flex", gap: "6px", marginTop: "10px", borderTop: "1px solid #3a3a3a", paddingTop: "10px" }}>
          <button
            onClick={onAddExtension}
            disabled={extensionUsed}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: extensionUsed ? "1px solid #3a3a3a" : "1px solid #4a6a9a",
              background: extensionUsed ? "#2a2a2a" : "#2a4a7a",
              color: extensionUsed ? "#666" : "white",
              fontWeight: 700,
              cursor: extensionUsed ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            +20 min
          </button>
          {extensionUsed && (
            <button
              onClick={onUndoExtension}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #6a4a4a",
                background: "#5a2a2a",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Undo +20 min
            </button>
          )}
        </div>
      )}
    </div>
  );
}
