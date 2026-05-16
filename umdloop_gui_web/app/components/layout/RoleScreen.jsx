"use client";

import React, { useState } from "react";
import TechnicianDashboard from "../../features/technician/TechnicianDashboard";
import OperatorTab from "../../features/operator/OperatorTab";
import Navigation from "../../features/navigation/Navigation";
import ScienceMonitor from "../../features/science/ScienceMonitor";
import EquipmentOperatorView from "../../features/science/EquipmentOperatorView";
import SpectrometerScientistView from "../../features/science/SpectrometerScientistView";
import OperationsWall from "../../features/operations-wall/OperationsWall";
import MapView from "../map/MapView";
import SubsystemBar from "./SubsystemBar";
import ConnectionStatusBanner from "./ConnectionStatusBanner";
import { SUBSYSTEMS, NAVIGATION_BUTTONS } from "../../config";

export default function RoleScreen({ mission, role, onBack }) {
  const [selectedSubsystem, setSelectedSubsystem] = useState(SUBSYSTEMS[0]);
  const [selectedNavItem, setSelectedNavItem] = useState(NAVIGATION_BUTTONS[0]);

  const content = getRoleContent({
    mission,
    role,
    selectedSubsystem,
    setSelectedSubsystem,
    selectedNavItem,
    setSelectedNavItem,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#1a1a1a" }}>
      {/* Top bar with back button and role info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          background: "#3d3d3d",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#2a2a2a",
            border: "1px solid #555",
            borderRadius: "6px",
            padding: "6px 12px",
            cursor: "pointer",
            color: "#ccc",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#444";
            e.currentTarget.style.borderColor = "#777";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#2a2a2a";
            e.currentTarget.style.borderColor = "#555";
          }}
        >
          <span>←</span> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#888", fontSize: "0.85rem" }}>{mission.name}</span>
          <span style={{ color: "#555" }}>›</span>
          <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 500 }}>{role.name}</span>
        </div>
      </div>

      {/* Role content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {content}
      </div>

      <ConnectionStatusBanner />
    </div>
  );
}

function getRoleContent({ mission, role, selectedSubsystem, setSelectedSubsystem, selectedNavItem, setSelectedNavItem }) {
  // Rover Technician is the same across all missions
  if (role.id === "rover-technician") {
    return <TechnicianDashboard missionId={mission.id} />;
  }

  // Rover Operator maps to the existing drive view
  if (role.id === "rover-operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <OperatorTab selectedSubsystem="Drive (Default)" setSelectedSubsystem={() => {}} />
      </div>
    );
  }

  // Arm Operator maps to the existing arm view
  if (role.id === "arm-operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <OperatorTab selectedSubsystem="Arm" setSelectedSubsystem={() => {}} />
      </div>
    );
  }

  // Navigator maps to the existing navigation feature
  if (role.id === "navigator") {
    return (
      <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
        <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
          <SubsystemBar buttons={NAVIGATION_BUTTONS} selected={selectedNavItem} setSelected={setSelectedNavItem} />
          <div style={{ padding: "8px", overflow: "auto", flex: 1 }}>
            <Navigation selectedNavItem={selectedNavItem} />
          </div>
        </div>
      </div>
    );
  }

  // Drone Operator maps to the existing drone view
  if (role.id === "drone-operator") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "12px", height: "100%", padding: "10px" }}>
        <div style={{ minHeight: 0, border: "1px solid #333", borderRadius: "10px", overflow: "hidden" }}>
          <OperationsWall pane="drone" />
        </div>
        <div style={{ minHeight: 0, border: "1px solid #333", borderRadius: "10px", overflow: "hidden" }}>
          <MapView selectedSubsystem={selectedSubsystem} titleOverride="Drone: Map-View" />
        </div>
      </div>
    );
  }

  // Science Equipment Operator
  if (role.id === "science-equipment-operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <EquipmentOperatorView />
      </div>
    );
  }

  // Spectrometer Scientist
  if (role.id === "spectrometer-scientist") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <SpectrometerScientistView />
      </div>
    );
  }

  // Fluorometer Scientist
  if (role.id === "fluorometer-scientist") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <ScienceMonitor />
      </div>
    );
  }

  // Camera Operator (autonomous nav mission)
  if (role.id === "camera-operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <OperatorTab selectedSubsystem="Drive (Default)" setSelectedSubsystem={() => {}} />
      </div>
    );
  }

  // Software Specialist (autonomous nav mission)
  if (role.id === "software-specialist") {
    return (
      <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
        <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
          <SubsystemBar buttons={NAVIGATION_BUTTONS} selected={selectedNavItem} setSelected={setSelectedNavItem} />
          <div style={{ padding: "8px", overflow: "auto", flex: 1 }}>
            <Navigation selectedNavItem={selectedNavItem} />
          </div>
        </div>
      </div>
    );
  }

  // Fallback placeholder for roles not yet implemented (Auxiliary #1, #2, etc.)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#888",
        gap: "12px",
      }}
    >
      <span style={{ fontSize: "2rem" }}>🚧</span>
      <span style={{ fontSize: "1.1rem" }}>
        {role.name} — Screen not yet implemented
      </span>
      <span style={{ fontSize: "0.85rem", color: "#555" }}>
        {mission.name}
      </span>
    </div>
  );
}
