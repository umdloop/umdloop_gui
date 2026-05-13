"use client";

import React from "react";
import CameraFeed from "../../components/camera/CameraFeed";
import { CAMERA_ROLES } from "../../config";

export const DRIVE_PRESETS = [
  { name: "Drive Default", feeds: { leftTop: CAMERA_ROLES.FRONT, leftBottom: CAMERA_ROLES.BACK, rightTop: CAMERA_ROLES.LEFT_SIDE, rightBottom: CAMERA_ROLES.RIGHT_SIDE } },
  { name: "Drive Wheels", feeds: { leftTop: CAMERA_ROLES.WHEEL_TL, leftBottom: CAMERA_ROLES.WHEEL_TR, rightTop: CAMERA_ROLES.WHEEL_BL, rightBottom: CAMERA_ROLES.WHEEL_BR } },
];

export default function DriveMonitor({ drivePresetIdx, setDrivePresetIdx, driveRotate, setDriveRotate }) {
  const driveFeeds = DRIVE_PRESETS[drivePresetIdx].feeds;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, height: "100%" }}>
        <CameraFeed role={driveFeeds.leftTop} label="Drive Left A" rotateDeg={driveRotate} style={{ height: 170 }} />
        <CameraFeed role={driveFeeds.rightTop} label="Drive Right A" rotateDeg={driveRotate} style={{ height: 150 }} />
        <CameraFeed role={driveFeeds.leftBottom} label="Drive Left B" rotateDeg={driveRotate} style={{ height: 170 }} />
        <CameraFeed role={driveFeeds.rightBottom} label="Drive Right B" rotateDeg={driveRotate} style={{ height: 150 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {DRIVE_PRESETS.map((preset, idx) => (
          <button
            key={preset.name}
            onClick={() => setDrivePresetIdx(idx)}
            style={{
              flex: 1,
              borderRadius: 9999,
              border: "1px solid #5b5b5b",
              background: idx === drivePresetIdx ? "#6d1111" : "#2f2f2f",
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
          onClick={() => setDriveRotate((prev) => (prev + 90) % 360)}
          style={{ borderRadius: 9999, border: "1px solid #5b5b5b", background: "#2f2f2f", color: "white", padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
        >
          Rotate
        </button>
      </div>
    </>
  );
}
