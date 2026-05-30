"use client";

import React from "react";
import ObjectDetection from "./ObjectDetection";
import ControlPanel from "./ControlPanel";
import MapView from "../../components/map/MapView";

export default function Navigation({ selectedNavItem }) {
  return (
    <div style={selectedNavItem === "Map" ? { width: "100%", height: "100%" } : undefined}>
      {selectedNavItem === "Object Detection" && <ObjectDetection />}

      {selectedNavItem === "Control Panel" && <ControlPanel />}

      {selectedNavItem === "Map" && (
        <MapView titleOverride="Navigation — Map" />
      )}
    </div>
  );
}
