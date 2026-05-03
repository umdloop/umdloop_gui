"use client";

import React, { useEffect, useRef, useState } from "react";
import { getCameraSignalingUrl } from "../config";
import ArmOperatorTab from "./ArmOperatorTab";
import DriveOperatorTab from "./DriveOperatorTab";
import useCameraStreams from "./useCameraStreams";

const MAX_ACTIVE_DRIVE_CAMERAS = 4;
const DRIVE_CAMERA_TILE_COUNT = 8;
const DRIVE_SUBSYSTEMS = ["Drive (Default)", "Drive (Science)"];

const normalizeCameraId = (camera) => {
  const id = camera?.id ?? camera;
  if (id == null) return null;
  const normalized = String(id).trim();
  return normalized || null;
};

const normalizeCameraIds = (cameras) => {
  if (!Array.isArray(cameras)) return [];

  return [
    ...new Set(
      cameras
        .map((camera) => normalizeCameraId(camera))
        .filter(Boolean)
    ),
  ];
};

export default function OperatorTab({ selectedSubsystem }) {
  const isDriveSubsystem = DRIVE_SUBSYSTEMS.includes(selectedSubsystem);
  const isArmSubsystem = selectedSubsystem === "Arm";
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [fps, setFps] = useState(24);
  const [streamPlaying, setStreamPlaying] = useState(true);
  const [streamRefreshToken, setStreamRefreshToken] = useState(0);
  const [pausedSnapshots, setPausedSnapshots] = useState({});
  const [isRestartingFeeds, setIsRestartingFeeds] = useState(false);
  const [cameraRotateDeg, setCameraRotateDeg] = useState(0);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [armClampDistance, setArmClampDistance] = useState(35);
  const [grayscale, setGrayscale] = useState(false);
  const [cameraControlStatus, setCameraControlStatus] = useState("");
  const [cameraLoadState, setCameraLoadState] = useState({});
  const [availableCameras, setAvailableCameras] = useState([]);
  const [cameraListLoaded, setCameraListLoaded] = useState(false);
  const [activeDriveCameraIds, setActiveDriveCameraIds] = useState([]);
  const cameraImageRefs = useRef({});
  const restartTimerRef = useRef(null);
  const cameraSignalUrl = getCameraSignalingUrl();

  const cameraBySlot = (slot) => {
    if (!cameraListLoaded) return null;
    return availableCameras[slot] ?? null;
  };
  const driveCameraBySlot = (slot) => cameraBySlot(slot);
  const armCameraIds = [cameraBySlot(4), cameraBySlot(5), cameraBySlot(6), cameraBySlot(7)].filter(Boolean);
  const requestedCameraIds = [
    ...new Set(
      [
        ...(isDriveSubsystem ? activeDriveCameraIds : []),
        ...(isArmSubsystem ? armCameraIds : []),
        fullscreenCam?.id,
      ].map((id) => normalizeCameraId(id)).filter(Boolean)
    ),
  ];

  const {
    cameraIds: signaledCameraIds,
    streams: cameraStreams,
    status: cameraSocketStatus,
    detail: cameraSocketDetail,
    lastMessage: cameraLastMessage,
    stats: cameraStats,
    debug: cameraDebug,
  } = useCameraStreams(cameraSignalUrl, {
    reconnectToken: streamRefreshToken,
    activeCameraIds: requestedCameraIds,
  });

  const cameraButtonStyle = (active = false) => ({
    borderRadius: "6px",
    border: "1px solid #555",
    background: active ? "#6d1111" : "#303030",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "11px",
    padding: "6px 8px",
  });

  const setGstreamerGrayscale = async (enabled) => {
    setGrayscale(enabled);
    setCameraControlStatus(enabled ? "Local grayscale preview on" : "Local grayscale preview off");
  };

  const snapshotCamera = (cameraId) => {
    const image = cameraImageRefs.current[cameraId];
    const width = image?.videoWidth || image?.naturalWidth;
    const height = image?.videoHeight || image?.naturalHeight;
    if (!image || !width || !height) return null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.86);
    } catch (_) {
      return null;
    }
  };

  const captureVisibleSnapshots = () => {
    const nextSnapshots = {};
    Object.keys(cameraImageRefs.current).forEach((cameraId) => {
      const snapshot = snapshotCamera(cameraId);
      if (snapshot) nextSnapshots[cameraId] = snapshot;
    });
    setPausedSnapshots(nextSnapshots);
    return Object.keys(nextSnapshots).length;
  };

  const setAllCameraFramerate = (nextFps) => {
    setFps(nextFps);
    setCameraControlStatus(`All cameras target ${nextFps} FPS`);
  };

  const toggleDriveCamera = (cameraId) => {
    const normalizedCameraId = normalizeCameraId(cameraId);
    if (!normalizedCameraId) {
      setCameraControlStatus("No camera ID available yet from backend");
      return;
    }

    setActiveDriveCameraIds((current) => {
      if (current.includes(normalizedCameraId)) {
        setCameraControlStatus(`Camera ${normalizedCameraId} deactivated`);
        return current.filter((id) => id !== normalizedCameraId);
      }

      if (current.length >= MAX_ACTIVE_DRIVE_CAMERAS) {
        setCameraControlStatus(`Max ${MAX_ACTIVE_DRIVE_CAMERAS} camera streams active. Clear feeds before loading more.`);
        return current;
      }

      setCameraControlStatus(`Camera ${normalizedCameraId} activated`);
      return [...current, normalizedCameraId];
    });
  };

  const toggleStreamPlaying = () => {
    if (streamPlaying) {
      const snapshotCount = captureVisibleSnapshots();
      setStreamPlaying(false);
      setCameraControlStatus(snapshotCount ? "Feeds paused on last frame" : "Feeds paused");
      return;
    }

    setStreamPlaying(true);
    setPausedSnapshots({});
    setCameraControlStatus("Camera feeds playing");
  };

  const restartAllFeeds = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    setIsRestartingFeeds(true);
    setStreamPlaying(false);
    setPausedSnapshots({});
    setCameraLoadState({});
    setCameraControlStatus("Restarting camera feeds...");

    restartTimerRef.current = window.setTimeout(() => {
      setStreamRefreshToken((token) => token + 1);
      setStreamPlaying(true);
      setIsRestartingFeeds(false);
      setCameraControlStatus("Camera feeds reconnected");
    }, 300);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cameraSocketStatus === "connected") {
      const nextCameraIds = normalizeCameraIds(signaledCameraIds);
      setAvailableCameras(nextCameraIds);
      setCameraListLoaded(nextCameraIds.length > 0);
      return;
    }

    if (cameraSocketStatus === "error" || cameraSocketStatus === "disconnected") {
      setAvailableCameras([]);
      setCameraListLoaded(false);
    }
  }, [cameraSocketStatus, signaledCameraIds]);

  useEffect(() => {
    if (!cameraListLoaded) {
      setActiveDriveCameraIds([]);
      return;
    }

    setActiveDriveCameraIds((current) => {
      const stillAvailable = current.filter((id) => availableCameras.includes(id));
      return stillAvailable.length || !availableCameras.length ? stillAvailable : [availableCameras[0]];
    });
  }, [availableCameras, cameraListLoaded]);

  const CameraImage = ({ cameraId, alt, style, pausedStyle, pausedText = "Feed Paused", enabled = true, inactiveText, ...imageProps }) => {
    const normalizedCameraId = normalizeCameraId(cameraId);
    const frozenFrame = pausedSnapshots[cameraId];
    const frameStyle = {
      ...style,
      position: style?.position ?? "relative",
      overflow: style?.overflow ?? "hidden",
      display: style?.display ?? "block",
    };
    const mediaStyle = {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: style?.objectFit,
      borderRadius: style?.borderRadius,
      background: style?.background,
      transform: style?.transform,
      transformOrigin: style?.transformOrigin,
      cursor: style?.cursor,
      border: style?.border,
      filter: grayscale ? "grayscale(1)" : "none",
    };
    const overlayStyle = {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "8px",
      borderRadius: style?.borderRadius,
      background: style?.background,
      transform: style?.transform,
      transformOrigin: style?.transformOrigin,
      cursor: style?.cursor,
      border: style?.border,
      ...pausedStyle,
    };

    if (!enabled || !normalizedCameraId) {
      return (
        <div style={frameStyle} {...imageProps}>
          <div style={{ ...overlayStyle, color: "#777", fontWeight: 800 }}>
            {normalizedCameraId ? inactiveText || `Click to load camera ${normalizedCameraId}` : "No camera assigned"}
          </div>
        </div>
      );
    }

    const stream = cameraStreams[normalizedCameraId];

    if (!streamPlaying) {
      if (frozenFrame) {
        return (
          <div style={frameStyle} {...imageProps}>
            <img src={frozenFrame} alt={alt} style={mediaStyle} />
          </div>
        );
      }

      return (
        <div style={frameStyle} {...imageProps}>
          <div style={{ ...overlayStyle, color: "#bbb", fontWeight: 800 }}>
            {isRestartingFeeds ? "Restarting..." : pausedText}
          </div>
        </div>
      );
    }

    if (!stream) {
      return (
        <div style={frameStyle} {...imageProps}>
          <div style={{ ...overlayStyle, color: "#bbb", fontWeight: 800 }}>
            {cameraSocketStatus === "connected" ? "Waiting for WebRTC stream..." : "Connecting to camera backend..."}
          </div>
        </div>
      );
    }

    return (
      <div style={frameStyle} {...imageProps}>
        <video
          key={`${cameraId}-${streamRefreshToken}`}
          ref={(node) => {
            if (!node) return;
            cameraImageRefs.current[normalizedCameraId] = node;
            if (node.srcObject !== stream) {
              node.srcObject = stream;
            }
          }}
          autoPlay
          muted
          playsInline
          style={mediaStyle}
          onLoadedData={(e) => {
            setCameraLoadState((current) => {
              if (current[normalizedCameraId] === "loaded") return current;
              return { ...current, [normalizedCameraId]: "loaded" };
            });
            imageProps.onLoadedData?.(e);
          }}
          onError={(e) => {
            setCameraLoadState((current) => {
              const nextState = "error: stream";
              if (current[normalizedCameraId] === nextState) return current;
              return { ...current, [normalizedCameraId]: nextState };
            });
            imageProps.onError?.(e);
          }}
        />
      </div>
    );
  };

  const summarizeCameraLoadState = (cameraIds) => {
    const uniqueCameraIds = [...new Set(cameraIds)];
    const loaded = uniqueCameraIds.filter((id) => cameraLoadState[id] === "loaded");
    const failed = uniqueCameraIds.filter((id) => cameraLoadState[id]?.startsWith("error"));
    const waiting = uniqueCameraIds.filter((id) => !cameraLoadState[id]);

    return `loaded ${loaded.join(", ") || "none"} | failed ${failed.join(", ") || "none"} | waiting ${waiting.join(", ") || "none"}`;
  };

  const CameraCard = ({ camera, enabled = true, onInactiveClick }) => (
    <div
      onClick={() => {
        if (enabled) {
          setFullscreenCam(camera);
          return;
        }

        onInactiveClick?.();
      }}
      style={{
        background: "#2b2b2b",
        borderRadius: "10px",
        border: "1px solid #3d3d3d",
        padding: "5px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#c90202";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#3d3d3d";
      }}
    >
      <h4 style={{ color: "white", fontSize: "10px", fontWeight: "bold", textAlign: "center", marginBottom: "3px" }}>
        {camera.label} {camera.id ? `(${camera.id})` : "(No Cam)"}
      </h4>
      <CameraImage
        cameraId={camera.id}
        enabled={enabled}
        alt={camera.label}
        style={{
          width: "100%",
          flex: 1,
          objectFit: "cover",
          borderRadius: "6px",
          background: "black",
          minHeight: 0,
          transform: `rotate(${cameraRotateDeg}deg)`,
          transformOrigin: "center center",
        }}
        pausedStyle={{ fontSize: "12px" }}
      />
    </div>
  );

  const FullscreenOverlay = () =>
    fullscreenCam && (
      <div
        onClick={() => setFullscreenCam(null)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.95)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}
      >
        <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
        <CameraImage
          cameraId={fullscreenCam.id}
          alt={fullscreenCam.label}
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            borderRadius: "12px",
            background: "black",
            transform: `rotate(${cameraRotateDeg}deg)`,
            transformOrigin: "center center",
          }}
          pausedStyle={{ width: "min(900px, 90vw)", height: "60vh", fontSize: "18px" }}
        />
      </div>
    );

  if (isDriveSubsystem) {
    return (
      <DriveOperatorTab
        activeDriveCameraIds={activeDriveCameraIds}
        cameraButtonStyle={cameraButtonStyle}
        cameraControlStatus={cameraControlStatus}
        cameraDebug={cameraDebug}
        cameraLastMessage={cameraLastMessage}
        cameraRotateDeg={cameraRotateDeg}
        cameraSignalUrl={cameraSignalUrl}
        cameraSocketDetail={cameraSocketDetail}
        cameraSocketStatus={cameraSocketStatus}
        cameraStats={cameraStats}
        CameraCard={CameraCard}
        driveCameraBySlot={driveCameraBySlot}
        fps={fps}
        FullscreenOverlay={FullscreenOverlay}
        grayscale={grayscale}
        isRestartingFeeds={isRestartingFeeds}
        MAX_ACTIVE_DRIVE_CAMERAS={MAX_ACTIVE_DRIVE_CAMERAS}
        setActiveDriveCameraIds={setActiveDriveCameraIds}
        setCameraControlStatus={setCameraControlStatus}
        setCameraRotateDeg={setCameraRotateDeg}
        selectedSubsystem={selectedSubsystem}
        setEmergencyStop={setEmergencyStop}
        setGstreamerGrayscale={setGstreamerGrayscale}
        setAllCameraFramerate={setAllCameraFramerate}
        streamPlaying={streamPlaying}
        summarizeCameraLoadState={summarizeCameraLoadState}
        toggleDriveCamera={toggleDriveCamera}
        toggleStreamPlaying={toggleStreamPlaying}
        restartAllFeeds={restartAllFeeds}
        emergencyStop={emergencyStop}
        DRIVE_CAMERA_TILE_COUNT={DRIVE_CAMERA_TILE_COUNT}
      />
    );
  }

  if (isArmSubsystem) {
    return (
      <ArmOperatorTab
        armClampDistance={armClampDistance}
        cameraBySlot={cameraBySlot}
        CameraCard={CameraCard}
        emergencyStop={emergencyStop}
        FullscreenOverlay={FullscreenOverlay}
        setArmClampDistance={setArmClampDistance}
        setEmergencyStop={setEmergencyStop}
      />
    );
  }

  return null;
}
