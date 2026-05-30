"use client";

export const MODES = ["Operator", "Science", "Technician", "Drone", "Navigation", "Map"];
export const MODE_ICONS = ["camera.png", "test-tube.png", "sensor.png", "camera.png", "navigation.png", "map.png"];
export const NAV_MODES = MODES.filter((mode) => mode !== "Drone");
export const NAV_MODE_ICONS = NAV_MODES.map((mode) => MODE_ICONS[MODES.indexOf(mode)]);
export const SUBSYSTEMS = ["Drive (Default)", "Drive (Autonav)", "Drive (Science)", "Arm"];
export const SCIENCE_SUBSYSTEMS = [
  "Scientist 1 Tab 1",
  "Scientist 2 Tab 1",
  "Scientist 1 Tab 2",
  "Scientist 2 Tab 2",
  "Equipment Specialist Tab 1",
  "Equipment Specialist Tab 2",
];
export const NAVIGATION_BUTTONS = ["Object Detection", "Control Panel", "Map"];

export const CAMERA_ROLES = {
  FRONT:       "front",
  BACK:        "back",
  LEFT_SIDE:   "left_side",
  RIGHT_SIDE:  "right_side",
  RADIO_VIEW:  "radio_view",
  WHEEL_TL:    "wheel_tl",
  WHEEL_TR:    "wheel_tr",
  WHEEL_BL:    "wheel_bl",
  WHEEL_BR:    "wheel_br",
  ARM_BASE:    "arm_base",
  ARM_JOINT:   "arm_joint",
  ARM_EE:      "arm_ee",
  ARM_GRIPPER: "arm_gripper",
  OVERHEAD:     "overhead",
  SCOOPS_DIRT:  "scoops_dirt",
  SAMPLER:      "sampler",
  NIGHT_VISION: "night_vision",
};

// Target classes the YOLO node detects (mirror `target_classes` in
// yolo_ros_node.py). Selectable as the goal when navigating in Object
// Detection mode.
export const OBJECT_DETECTION_CLASSES = ["Bottle", "Mallet", "Rock-Pick-Hammer"];

// Maps a YOLO camera index (position in yolo_params.yaml image_topics list,
// publishes to /yolo/cam{index}/...) to the WebRTC camera role.
//
// yolo_params.yaml order:
//   0: /zed/zed_node/...        (ZED → assign "front" role in Camera Manager)
//   1: /cameras/cam0/image_raw  (USB cam 0 → assign whatever role fits)
//   2: /cameras/cam1/image_raw  (USB cam 1 → left_side)
//   3: /cameras/cam2/image_raw  (USB cam 2 → right_side)
export const YOLO_CAMERA_MAP = {
  0: CAMERA_ROLES.FRONT,
  1: CAMERA_ROLES.BACK,
  2: CAMERA_ROLES.LEFT_SIDE,
  3: CAMERA_ROLES.RIGHT_SIDE,
};
