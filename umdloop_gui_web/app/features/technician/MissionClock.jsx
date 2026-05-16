"use client";

import React, { useState } from "react";

export default function MissionClock({
  hours,
  minutes,
  seconds,
  remainingSeconds,
  setTimerRunning,
  configuredSeconds,
  setRemainingSeconds,
  missionId,
  extensionState,
  onAddExtension,
  onUndoExtension,
}) {
  const isDelivery = missionId === "delivery";
  const canAdd = extensionState === "none";
  const canUndo = extensionState === "added";

  const [confirmAction, setConfirmAction] = useState(null);

  const requestPause = () => setConfirmAction("pause");
  const requestReset = () => setConfirmAction("reset");

  const cancelConfirm = () => setConfirmAction(null);
  const acceptConfirm = () => {
    if (confirmAction === "pause") {
      setTimerRunning(false);
    } else if (confirmAction === "reset") {
      setTimerRunning(false);
      setRemainingSeconds(configuredSeconds);
    }
    setConfirmAction(null);
  };

  return (
    <div style={{ background: "#202020", border: "1px solid #3a3a3a", borderRadius: "12px", padding: "12px" }}>
      <div style={{ fontSize: "20px", color: "#cfcfcf", marginBottom: "8px", fontWeight: 800 }}>Mission Clock</div>
      <div style={{ fontSize: "28px", fontWeight: 900, color: "white", letterSpacing: "1px" }}>{hours}:{minutes}:{seconds}</div>

      <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
        <button onClick={() => setTimerRunning(true)} disabled={remainingSeconds <= 0} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2f6b2f", background: remainingSeconds > 0 ? "#1f7a1f" : "#3a3a3a", color: "white", fontWeight: 700, cursor: remainingSeconds > 0 ? "pointer" : "not-allowed", fontSize: "18px" }}>Start</button>
        <button onClick={requestPause} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Pause</button>
        <button onClick={requestReset} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#3a3a3a", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "18px" }}>Reset</button>
      </div>

      {isDelivery && (
        <div style={{ display: "flex", gap: "6px", marginTop: "10px", borderTop: "1px solid #3a3a3a", paddingTop: "10px" }}>
          <button
            onClick={onAddExtension}
            disabled={!canAdd}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: canAdd ? "1px solid #4a6a9a" : "1px solid #3a3a3a",
              background: canAdd ? "#2a4a7a" : "#2a2a2a",
              color: canAdd ? "white" : "#666",
              fontWeight: 700,
              cursor: canAdd ? "pointer" : "not-allowed",
              fontSize: "16px",
            }}
          >
            +20 min
          </button>
          <button
            onClick={onUndoExtension}
            disabled={!canUndo}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: canUndo ? "1px solid #6a4a4a" : "1px solid #3a3a3a",
              background: canUndo ? "#5a2a2a" : "#2a2a2a",
              color: canUndo ? "white" : "#666",
              fontWeight: 700,
              cursor: canUndo ? "pointer" : "not-allowed",
              fontSize: "16px",
            }}
          >
            -20 min
          </button>
        </div>
      )}

      {confirmAction && (
        <div
          onClick={cancelConfirm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 92vw)",
              background: "#222",
              border: "1px solid #4a4a4a",
              borderRadius: "12px",
              padding: "18px",
              color: "white",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 900, marginBottom: "6px" }}>Are you sure?</div>
            <div style={{ fontSize: "13px", color: "#cfcfcf", marginBottom: "14px" }}>
              {confirmAction === "pause"
                ? "Pause the mission timer?"
                : "Reset the mission timer to its configured time?"}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={cancelConfirm}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #6a6a6a", background: "#333", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                onClick={acceptConfirm}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #803737", background: "#8a1f1f", color: "white", fontWeight: 800, cursor: "pointer", fontSize: "14px" }}
              >
                {confirmAction === "pause" ? "Pause" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
