"use client";

import React from "react";
import MapView from "./MapView";
import OperationsWall from "./OperationsWall";
import OperatorTab from "./OperatorTab";
import Navigation from "./Navigation";
import TechnicianDashboard from "./TechnicianDashboard";
import SubsystemBar from "./SubsystemBar";
import { NAVIGATION_BUTTONS } from "./pageConstants";

export default function PageContent({
  selectedMode,
  selectedSubsystem,
  setSelectedSubsystem,
  selectedNavItem,
  setSelectedNavItem,
}) {
  if (selectedMode === "Operator") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <OperatorTab selectedSubsystem={selectedSubsystem} setSelectedSubsystem={setSelectedSubsystem} />
      </div>
    );
  }

  if (selectedMode === "Technician") {
    return (
      <div style={{ height: "100%", minHeight: 0 }}>
        <TechnicianDashboard />
      </div>
    );
  }

  if (selectedMode === "Drone") {
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

  if (selectedMode === "Navigation") {
    return (
      <div style={{ minHeight: 0, height: "100%", padding: "10px" }}>
        <div style={{ border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1f1f1f", height: "100%", display: "flex", flexDirection: "column" }}>
          <SubsystemBar buttons={NAVIGATION_BUTTONS} selected={selectedNavItem} setSelected={setSelectedNavItem} />
          <div style={{ padding: "8px", overflow: "auto" }}>
            <Navigation selectedNavItem={selectedNavItem} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
