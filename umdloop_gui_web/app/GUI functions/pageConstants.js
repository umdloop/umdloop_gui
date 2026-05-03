"use client";

export const MODES = ["Operator", "Technician", "Drone", "Navigation", "Map"];
export const MODE_ICONS = ["camera.png", "sensor.png", "camera.png", "navigation.png", "map.png"];
export const SUBSYSTEMS = ["Drive", "Arm", "Science"];
export const NAVIGATION_BUTTONS = ["Object Detection", "Control Panel", "Placeholder2"];

export const CAMERA_ROLES = {
  FRONT:       "front",
  BACK:        "back",
  LEFT_SIDE:   "left_side",
  RIGHT_SIDE:  "right_side",
  WHEEL_TL_A:  "wheel_tl_a",
  WHEEL_TL_B:  "wheel_tl_b",
  WHEEL_TR_A:  "wheel_tr_a",
  WHEEL_TR_B:  "wheel_tr_b",
  WHEEL_BL_A:  "wheel_bl_a",
  WHEEL_BL_B:  "wheel_bl_b",
  WHEEL_BR_A:  "wheel_br_a",
  WHEEL_BR_B:  "wheel_br_b",
  ARM_BASE:    "arm_base",
  ARM_JOINT:   "arm_joint",
  ARM_EE:      "arm_ee",
  ARM_GRIPPER: "arm_gripper",
  SCIENCE_1:   "science_1",
  SCIENCE_2:   "science_2",
  SCIENCE_3:   "science_3",
};
