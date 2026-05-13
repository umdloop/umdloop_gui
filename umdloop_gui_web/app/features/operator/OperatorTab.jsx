"use client";

import React, { useEffect, useState } from "react";
import FullscreenCameraOverlay from "../../components/camera/FullscreenCameraOverlay";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import DriveView from "./DriveView";
import ArmView from "./ArmView";
import ScienceView from "./ScienceView";
import DriveScienceView from "./DriveScienceView";

const CAMERA_ROTATIONS_STORAGE_KEY = "umdloop.cameraRotations";

export default function OperatorTab({ selectedSubsystem, setSelectedSubsystem }) {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [cameraRotationByKey, setCameraRotationByKey] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(CAMERA_ROTATIONS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [locationReached, setLocationReached] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
        setLocationReached(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CAMERA_ROTATIONS_STORAGE_KEY, JSON.stringify(cameraRotationByKey));
  }, [cameraRotationByKey]);

  const getCameraKey = (camera) => camera?.role ?? camera?.label;
  const getCameraRotation = (camera) => {
    const cameraKey = getCameraKey(camera);
    return cameraKey ? cameraRotationByKey[cameraKey] ?? 0 : 0;
  };

  const updateFullscreenRotation = (getNextRotation) => {
    const cameraKey = getCameraKey(fullscreenCam);
    if (!cameraKey) return;

    setCameraRotationByKey((prev) => {
      const currentRotation = prev[cameraKey] ?? 0;
      const nextRotation = typeof getNextRotation === "function"
        ? getNextRotation(currentRotation)
        : getNextRotation;
      const normalizedRotation = ((nextRotation % 360) + 360) % 360;

      return {
        ...prev,
        [cameraKey]: normalizedRotation,
      };
    });
  };

  const sharedProps = {
    selectedSubsystem,
    setSelectedSubsystem,
    fullscreenCam,
    setFullscreenCam,
    getCameraRotation,
    emergencyStop,
    setEmergencyStop,
    showCameraManager,
    setShowCameraManager,
    locationReached,
    setLocationReached,
  };

  let content = null;

  if (selectedSubsystem === "Drive (Science)") {
    content = <DriveScienceView />;
  } else if (selectedSubsystem === "Drive (Default)" || selectedSubsystem === "Drive") {
    content = <DriveView {...sharedProps} />;
  } else if (selectedSubsystem === "Arm") {
    content = <ArmView {...sharedProps} />;
  } else if (selectedSubsystem === "Science") {
    content = <ScienceView {...sharedProps} />;
  }

  return (
    <>
      {content}
      <FullscreenCameraOverlay
        camera={fullscreenCam}
        rotation={getCameraRotation(fullscreenCam)}
        onRotate={(valOrFn) => {
          if (valOrFn === null) {
            setFullscreenCam(null);
          } else {
            updateFullscreenRotation(valOrFn);
          }
        }}
      />
      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </>
  );
}
