"use client";

import React from "react";
import ObjectDetection from "./ObjectDetection";
import ControlPanel from "./ControlPanel";
import RosCommandPanel from "./RosCommandPanel";

export default function Navigation({ selectedNavItem }) {
  return (
    <div>
      <h1>{selectedNavItem} - Navigation Mode</h1>

      {selectedNavItem === "Object Detection" && <ObjectDetection />}

      {selectedNavItem === "Control Panel" && <ControlPanel />}

      {selectedNavItem === "Placeholder2" && <RosCommandPanel />}
    </div>
  );
}
