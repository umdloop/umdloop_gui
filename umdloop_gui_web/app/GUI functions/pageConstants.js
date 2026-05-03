"use client";

export const MODES = ["Operator", "Science", "Technician", "Drone", "Navigation", "Map"];
export const MODE_ICONS = ["camera.png", "test-tube.png", "sensor.png", "camera.png", "navigation.png", "map.png"];
export const NAV_MODES = MODES.filter((mode) => mode !== "Drone");
export const NAV_MODE_ICONS = NAV_MODES.map((mode) => MODE_ICONS[MODES.indexOf(mode)]);
export const SUBSYSTEMS = ["Drive (Default)", "Drive (Science)", "Arm"];
export const SCIENCE_SUBSYSTEMS = [
  "Scientist 1 Tab 1",
  "Scientist 2 Tab 1",
  "Scientist 1 Tab 2",
  "Scientist 2 Tab 2",
  "Equipment Specialist Tab 1",
  "Equipment Specialist Tab 2",
];
export const NAVIGATION_BUTTONS = ["Object Detection", "Control Panel", "Placeholder2"];
