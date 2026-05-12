"use client";

import React, { createContext, useContext } from "react";
import useWebRTCCameras from "./useWebRTCCameras";

const EMPTY = {
  connected: false,
  cameras: [],
  stats: {},
  streams: {},
  missions: [],
  activeMission: null,
  enableCamera: () => {},
  disableCamera: () => {},
  renameCamera: () => {},
  setRole: () => {},
  setConfig: () => {},
  saveMission: () => {},
  loadMission: () => {},
  deleteMission: () => {},
};

const WebRTCContext = createContext(EMPTY);

export function WebRTCProvider({ url, children }) {
  const value = useWebRTCCameras(url);
  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
}

export function useWebRTC() {
  return useContext(WebRTCContext);
}
