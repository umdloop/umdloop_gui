"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

export const ARM_PRESETS = [
  { name: "Arm Default", feeds: { mainTop: CAMERA_ROLES.ARM_BASE, mainBottom: CAMERA_ROLES.ARM_EE, auxTop: CAMERA_ROLES.ARM_JOINT, auxBottom: CAMERA_ROLES.ARM_GRIPPER } },
  { name: "Arm Closeup", feeds: { mainTop: CAMERA_ROLES.ARM_EE, mainBottom: CAMERA_ROLES.ARM_GRIPPER, auxTop: CAMERA_ROLES.ARM_BASE, auxBottom: CAMERA_ROLES.ARM_JOINT } },
];

export default function ArmMonitor({ armPresetIdx, setArmPresetIdx, armRotate, setArmRotate }) {
  const armFeeds = ARM_PRESETS[armPresetIdx].feeds;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gridTemplateRows: "1fr 1fr", gap: 8, height: "100%" }}>
        <CameraFeed role={armFeeds.mainTop} label="Arm Main A" rotateDeg={armRotate} style={{ height: 170 }} />
        <CameraFeed role={armFeeds.auxTop} label="Arm Aux A" rotateDeg={armRotate} style={{ height: 150 }} />
        <CameraFeed role={armFeeds.mainBottom} label="Arm Main B" rotateDeg={armRotate} style={{ height: 170 }} />
        <CameraFeed role={armFeeds.auxBottom} label="Arm Aux B" rotateDeg={armRotate} style={{ height: 150 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {ARM_PRESETS.map((preset, idx) => (
          <button
            key={preset.name}
            onClick={() => setArmPresetIdx(idx)}
            style={{
              flex: 1,
              borderRadius: 9999,
              border: "1px solid #5b5b5b",
              background: idx === armPresetIdx ? "#6d1111" : "#2f2f2f",
              color: "white",
              padding: "7px 10px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {preset.name}
          </button>
        ))}
        <button
          onClick={() => setArmRotate((prev) => (prev + 90) % 360)}
          style={{ borderRadius: 9999, border: "1px solid #5b5b5b", background: "#2f2f2f", color: "white", padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
        >
          Rotate
        </button>
      </div>
    </>
  );
}
