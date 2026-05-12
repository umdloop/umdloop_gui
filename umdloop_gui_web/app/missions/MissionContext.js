"use client";

import { createContext, useContext } from "react";

const MissionContext = createContext(null);

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) {
    throw new Error("useMission must be used within a MissionProvider");
  }
  return ctx;
}

export default MissionContext;
