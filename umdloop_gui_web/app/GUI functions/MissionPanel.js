"use client";

import React, { useState } from "react";
import { useWebRTC } from "../hooks/WebRTCContext";

export default function MissionPanel() {
  const { missions, activeMission, saveMission, loadMission, deleteMission } = useWebRTC();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const selectedMission = missions.find((m) => m.id === selectedId);

  const handleSave = () => {
    if (!saveName.trim()) return;
    const overwrite = missions.find((m) => m.name === saveName.trim());
    saveMission(saveName.trim(), overwrite?.id);
    setSaveName("");
  };

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      deleteMission(id);
      setConfirmDelete(null);
      if (selectedId === id) setSelectedId(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const btnBase = {
    borderRadius: 6,
    border: "1px solid #555",
    background: "#303030",
    color: "white",
    cursor: "pointer",
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
  };

  return (
    <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: 10, padding: "6px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#ddd", fontWeight: 800 }}>Mission:</span>
        <span style={{ fontSize: 11, color: activeMission ? "#7ee07e" : "#888" }}>
          {activeMission ? missions.find((m) => m.id === activeMission)?.name ?? activeMission : "None"}
        </span>
        <button onClick={() => setExpanded((v) => !v)} style={{ ...btnBase, marginLeft: "auto" }}>
          {expanded ? "Hide" : "Manage"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              style={{ flex: 1, padding: "4px 6px", borderRadius: 6, background: "#2e2e2e", border: "1px solid #555", color: "white", fontSize: 11 }}
            >
              <option value="">-- Select mission --</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id} style={{ fontWeight: m.id === activeMission ? 800 : 400 }}>
                  {m.name}{m.id === activeMission ? " ✓" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedId && loadMission(selectedId)}
              disabled={!selectedId}
              style={{ ...btnBase, background: selectedId ? "#1f5f1f" : "#2a2a2a", opacity: selectedId ? 1 : 0.5 }}
            >
              Load
            </button>
            <button
              onClick={() => selectedId && handleDelete(selectedId)}
              disabled={!selectedId}
              style={{ ...btnBase, background: confirmDelete === selectedId ? "#7a1f1f" : "#303030", opacity: selectedId ? 1 : 0.5 }}
            >
              {confirmDelete === selectedId ? "Confirm?" : "Delete"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Mission name..."
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={{ flex: 1, padding: "4px 8px", borderRadius: 6, background: "#2e2e2e", border: "1px solid #555", color: "white", fontSize: 11 }}
            />
            <button onClick={handleSave} style={{ ...btnBase, background: "#1a3f6f" }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
