"use client";

import React, { useState } from "react";
import NavigationBar from "./GUI functions/NavigationBar";
import PageContent from "./GUI functions/PageContent";
import SubsystemBar from "./GUI functions/SubsystemBar";
import { MODES, NAVIGATION_BUTTONS, SUBSYSTEMS } from "./GUI functions/pageConstants";

export default function LoopGui() {
  console.log("🔥 LOOP GUI RENDERED");
  const [selectedMode, setSelectedMode] = useState(MODES[0]);
  const [selectedSubsystem, setSelectedSubsystem] = useState(SUBSYSTEMS[0]);
  const [selectedNavItem, setSelectedNavItem] = useState(NAVIGATION_BUTTONS[0]);

  const showSubsystemBar =
    selectedMode !== "Navigation" &&
    selectedMode !== "Drone" &&
    selectedMode !== "Technician" &&
    selectedMode !== "Map";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#1a1a1a" }}>
      <NavigationBar selectedMode={selectedMode} setSelectedMode={setSelectedMode} />

      {showSubsystemBar ? (
        <SubsystemBar
          buttons={SUBSYSTEMS}
          selected={selectedSubsystem}
          setSelected={setSelectedSubsystem}
        />
      ) : null}

      <div style={{ flex: 1, minHeight: 0, overflow: selectedMode === "Navigation" || selectedMode === "Technician" ? "auto" : "hidden" }}>
        <PageContent
          selectedMode={selectedMode}
          selectedSubsystem={selectedSubsystem}
          setSelectedSubsystem={setSelectedSubsystem}
          selectedNavItem={selectedNavItem}
          setSelectedNavItem={setSelectedNavItem}
        />
      </div>
    </div>
  );
}
