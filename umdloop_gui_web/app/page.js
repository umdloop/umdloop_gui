"use client";

import React, { useState } from "react";
import MissionSelect from "./components/layout/MissionSelect";
import RoleSelect from "./components/layout/RoleSelect";
import RoleScreen from "./components/layout/RoleScreen";
import { getWebRTCUrl } from "./config";
import { WebRTCProvider } from "./context/WebRTCContext";

export default function LoopGui() {
  const [selectedMission, setSelectedMission] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // Mission selection screen
  if (!selectedMission) {
    return <MissionSelect onSelectMission={setSelectedMission} />;
  }

  // Role selection screen
  if (!selectedRole) {
    return (
      <RoleSelect
        mission={selectedMission}
        onSelectRole={setSelectedRole}
        onBack={() => setSelectedMission(null)}
      />
    );
  }

  // Role-specific operator screen
  return (
    <WebRTCProvider url={getWebRTCUrl()}>
      <RoleScreen
        mission={selectedMission}
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    </WebRTCProvider>
  );
}
