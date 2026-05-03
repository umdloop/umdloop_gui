import React, { useEffect, useRef, useState } from "react";

export default function DriveOperatorTab({
  activeDriveCameraIds,
  cameraButtonStyle,
  cameraControlStatus,
  cameraDebug,
  cameraLastMessage,
  cameraRotateDeg,
  cameraSignalUrl,
  cameraSocketDetail,
  cameraSocketStatus,
  cameraStats,
  CameraCard,
  driveCameraBySlot,
  DRIVE_CAMERA_TILE_COUNT,
  emergencyStop,
  fps,
  FullscreenOverlay,
  grayscale,
  isRestartingFeeds,
  MAX_ACTIVE_DRIVE_CAMERAS,
  restartAllFeeds,
  selectedSubsystem,
  setActiveDriveCameraIds,
  setAllCameraFramerate,
  setCameraControlStatus,
  setCameraRotateDeg,
  setEmergencyStop,
  setGstreamerGrayscale,
  streamPlaying,
  summarizeCameraLoadState,
  toggleDriveCamera,
  toggleStreamPlaying,
}) {
  const driveCameras = Array.from({ length: DRIVE_CAMERA_TILE_COUNT }, (_, index) => ({
    label: `Drive Cam ${index + 1}`,
    id: driveCameraBySlot(index),
  }));
  const driveCameraIds = driveCameras.map((camera) => camera.id);
  const isDriveCameraActive = (cameraId) => activeDriveCameraIds.includes(cameraId);
  const topRowCameras = driveCameras.slice(0, 2);
  const bottomLeftCameras = driveCameras.slice(2, 5);
  const bottomRightCameras = driveCameras.slice(5, 8);
  const isDriveScienceTab = selectedSubsystem === "Drive (Science)";
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [showCameraDebugDetails, setShowCameraDebugDetails] = useState(false);
  const [locationReached, setLocationReached] = useState(false);
  const stopwatchStartRef = useRef(null);
  const driveRosCommandPlaceholders = ["ROS2 Command 1", "ROS2 Command 2", "ROS2 Command 3", "ROS2 Command 4"];
  const confettiPieces = Array.from({ length: 42 }, (_, index) => ({
    id: index,
    color: ["#ff4d4d", "#ffd166", "#06d6a0", "#4cc9f0", "#f72585", "#ffffff"][index % 6],
    delay: `${(index % 7) * 0.08}s`,
    duration: `${1.55 + (index % 5) * 0.16}s`,
    rotation: `${(index * 37) % 360}deg`,
    burstX: `${((index % 10) - 4.5) * 10}px`,
    burstY: `${-185 - (index % 7) * 24}px`,
    fallX: `${((index % 12) - 5.5) * 24}px`,
    fallY: `${300 + (index % 8) * 36}px`,
  }));

  useEffect(() => {
    if (!locationReached) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLocationReached(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locationReached]);

  useEffect(() => {
    if (!stopwatchRunning) return undefined;

    const intervalId = window.setInterval(() => {
      const startedAt = stopwatchStartRef.current ?? Date.now();
      setStopwatchElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [stopwatchRunning]);

  const formatStopwatch = (elapsedMs) => {
    const totalTenths = Math.floor(elapsedMs / 100);
    const minutes = String(Math.floor(totalTenths / 600)).padStart(2, "0");
    const seconds = String(Math.floor((totalTenths % 600) / 10)).padStart(2, "0");
    const tenths = totalTenths % 10;
    return `${minutes}:${seconds}.${tenths}`;
  };

  const startStopwatch = () => {
    stopwatchStartRef.current = Date.now() - stopwatchElapsedMs;
    setStopwatchRunning(true);
  };

  const pauseStopwatch = () => {
    const startedAt = stopwatchStartRef.current ?? Date.now();
    setStopwatchElapsedMs(Date.now() - startedAt);
    setStopwatchRunning(false);
  };

  const resetStopwatch = () => {
    stopwatchStartRef.current = Date.now();
    setStopwatchElapsedMs(0);
    setStopwatchRunning(false);
  };

  if (isDriveScienceTab) {
    const scienceDrivePanels = [
      { title: "Wide-Angle Panorama Image", tone: "#2d4f62" },
      { title: "Stratigraphic Profile Image", tone: "#6a5234" },
      { title: "Close-Up High Res. Image", tone: "#5c3f2d" },
      { title: "GNSS Coords. / Elevation", tone: "#2d3b4f" },
    ];

    return (
      <div style={{ padding: "12px", minHeight: 0, height: "100%", background: "#1a1a1a", overflow: "auto" }}>
        <div style={{ width: "100%", border: "2px solid #3d3d3d", borderRadius: "14px", background: "#202020", padding: "16px", display: "grid", gridTemplateRows: "auto auto repeat(4, minmax(0, 1fr))", gap: "12px", minHeight: "100%" }}>
          <div style={{ color: "white", fontWeight: 900, fontSize: "18px", textAlign: "center", letterSpacing: "0.03em" }}>
            Rover Operator (Driver)
          </div>
          <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "8px" }}>
            <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Stopwatch
            </div>
            <div style={{ color: "white", fontSize: "28px", fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
              {formatStopwatch(stopwatchElapsedMs)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              <button
                onClick={stopwatchRunning ? pauseStopwatch : startStopwatch}
                style={{ borderRadius: "8px", border: "1px solid #555", background: stopwatchRunning ? "#6d1111" : "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
              >
                {stopwatchRunning ? "Pause" : "Start"}
              </button>
              <button
                onClick={resetStopwatch}
                style={{ borderRadius: "8px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", fontWeight: 700, padding: "6px 10px" }}
              >
                Reset
              </button>
            </div>
          </div>
          {scienceDrivePanels.map((panel) => (
            <div key={panel.title} style={{ background: "#232323", border: "2px solid #3d3d3d", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: "8px", minHeight: 0 }}>
              <div style={{ color: "#e8e8e8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {panel.title}
              </div>
              <div
                style={{
                  borderRadius: "8px",
                  border: "1px solid #4a4a4a",
                  background: `linear-gradient(180deg, ${panel.tone} 0%, #1b1b1b 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.82)",
                  fontWeight: 800,
                  fontSize: panel.title === "GNSS Coords. / Elevation" ? "18px" : "20px",
                  textAlign: "center",
                  padding: "12px",
                  minHeight: 0,
                }}
              >
                {panel.title === "GNSS Coords. / Elevation" ? "GNSS Coords. / Elevation" : panel.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "8px", minHeight: 0, height: "100%", background: "#1a1a1a" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px", position: "relative" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Control State + Safety</div>
          <button
            onClick={() => setEmergencyStop((prev) => !prev)}
            style={{ width: "100%", borderRadius: "8px", border: "1px solid #803737", padding: "7px", cursor: "pointer", background: emergencyStop ? "#a31616" : "#3a3a3a", color: "white", fontWeight: 900 }}
          >
            {emergencyStop ? "EMERGENCY STOP ACTIVE" : "Emergency Stop"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", marginTop: "8px" }}>
            {driveRosCommandPlaceholders.map((commandLabel) => (
              <button
                key={commandLabel}
                type="button"
                style={{
                  minHeight: "42px",
                  borderRadius: "8px",
                  border: "1px solid #555",
                  background: "#303030",
                  color: "#d8d8d8",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: "10px",
                  padding: "6px",
                }}
              >
                {commandLabel}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px" }}>
          <div style={{ fontSize: "11px", color: "#ddd", marginBottom: "6px", fontWeight: 800 }}>Vision + Stream Control</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto minmax(120px, 1fr) auto", gap: "8px", alignItems: "center", marginBottom: "7px" }}>
            <span style={{ color: "#ddd", fontSize: "11px", fontWeight: 800 }}>FPS</span>
            <input
              type="range"
              min={1}
              max={60}
              value={fps}
              onChange={(e) => setAllCameraFramerate(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <span style={{ color: "white", fontSize: "12px", fontWeight: 800, minWidth: "44px", textAlign: "right" }}>{fps}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", alignItems: "stretch" }}>
            <button onClick={() => setGstreamerGrayscale(!grayscale)} style={cameraButtonStyle(grayscale)}>{grayscale ? "Color Feed" : "All B/W"}</button>
            <button onClick={restartAllFeeds} disabled={isRestartingFeeds} style={{ ...cameraButtonStyle(false), opacity: isRestartingFeeds ? 0.75 : 1 }}>{isRestartingFeeds ? "Restarting..." : "Restart Feed"}</button>
            <button onClick={toggleStreamPlaying} style={cameraButtonStyle(!streamPlaying)}>{streamPlaying ? "Pause Feed" : "Play Feed"}</button>
            <button
              onClick={() => {
                setActiveDriveCameraIds([]);
                setCameraControlStatus("Drive camera feeds cleared");
              }}
              style={cameraButtonStyle(false)}
            >
              Clear Feeds
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#bbb", marginTop: "5px" }}>Target framerate: {fps} FPS</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between", marginTop: "5px" }}>
            <div style={{ fontSize: "11px", color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {cameraControlStatus || `Signal: ${cameraSocketStatus}`}
            </div>
            <div
              onMouseEnter={() => setShowCameraDebugDetails(true)}
              onMouseLeave={() => setShowCameraDebugDetails(false)}
              style={{
                position: "relative",
                flex: "0 0 auto",
                borderRadius: "9999px",
                border: "1px solid #555",
                background: "#303030",
                color: "#d8d8d8",
                fontSize: "10px",
                fontWeight: 900,
                padding: "4px 8px",
                cursor: "default",
              }}
            >
              Signal Details
              {showCameraDebugDetails ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    zIndex: 20,
                    width: "min(520px, 70vw)",
                    borderRadius: "10px",
                    border: "1px solid #555",
                    background: "#1f1f1f",
                    boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
                    padding: "10px",
                    display: "grid",
                    gap: "5px",
                    color: "#d8d8d8",
                    fontSize: "10px",
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ overflowWrap: "anywhere" }}>Camera signaling: {cameraSignalUrl}</div>
                  <div style={{ overflowWrap: "anywhere" }}>Drive cameras: {driveCameraIds.filter(Boolean).join(", ") || "none detected"}</div>
                  <div>Camera load: {summarizeCameraLoadState(activeDriveCameraIds)} | active {activeDriveCameraIds.length}/{MAX_ACTIVE_DRIVE_CAMERAS}</div>
                  <div>Signal: {cameraSocketStatus} | last {cameraLastMessage || "none"} | stats keys {Object.keys(cameraStats || {}).length}</div>
                  <div style={{ color: "#aaa", overflowWrap: "anywhere" }}>{cameraSocketDetail}</div>
                  <div style={{ color: "#aaa", overflowWrap: "anywhere" }}>Sent: {cameraDebug?.lastSentRaw || "none"} | recv: {cameraDebug?.lastReceivedRaw || "none"}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#232323", border: "1px solid #3d3d3d", borderRadius: "10px", padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#ddd", fontWeight: 800 }}>Rotate:</span>
        <button onClick={() => setCameraRotateDeg((d) => (d - 90 + 360) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>-90°</button>
        <button onClick={() => setCameraRotateDeg((d) => (d + 90) % 360)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>+90°</button>
        <button onClick={() => setCameraRotateDeg(0)} style={{ borderRadius: "6px", border: "1px solid #555", background: "#303030", color: "white", cursor: "pointer", padding: "4px 10px", fontSize: "11px" }}>Reset</button>
        <button
          onClick={() => setLocationReached(true)}
          style={{
            marginLeft: "auto",
            borderRadius: "8px",
            border: locationReached ? "1px solid #2f7d3a" : "1px solid #803737",
            background: locationReached ? "#1f8f35" : "#8a1f1f",
            color: "white",
            cursor: "pointer",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 900,
          }}
        >
          Location Reached
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: "6px", minHeight: 0, height: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {topRowCameras.map((camera, index) => (
            <CameraCard
              key={camera.id || `drive-top-${index}`}
              camera={camera}
              enabled={isDriveCameraActive(camera.id)}
              onInactiveClick={() => toggleDriveCamera(camera.id)}
            />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", minHeight: 0 }}>
          {[bottomLeftCameras, bottomRightCameras].map((cameraGroup, groupIndex) => (
            <div
              key={`drive-group-${groupIndex}`}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px", minHeight: 0 }}
            >
              {cameraGroup.map((camera, index) => (
                <CameraCard
                  key={camera.id || `drive-bottom-${groupIndex}-${index}`}
                  camera={camera}
                  enabled={isDriveCameraActive(camera.id)}
                  onInactiveClick={() => toggleDriveCamera(camera.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <FullscreenOverlay />
      {locationReached ? (
        <div
          tabIndex={-1}
          onClick={() => setLocationReached(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.86)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            overflow: "hidden",
          }}
        >
          <style>
            {`
              @keyframes locationReachedConfetti {
                0% {
                  opacity: 0;
                  transform: translate3d(-50%, -50%, 0) rotate(0deg) scale(0.65);
                }
                10% {
                  opacity: 1;
                }
                36% {
                  opacity: 1;
                  transform: translate3d(calc(-50% + var(--confetti-burst-x)), calc(-50% + var(--confetti-burst-y)), 0) rotate(260deg) scale(1);
                }
                100% {
                  opacity: 0;
                  transform: translate3d(calc(-50% + var(--confetti-fall-x)), calc(-50% + var(--confetti-fall-y)), 0) rotate(780deg) scale(0.95);
                }
              }
            `}
          </style>
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: piece.id % 3 === 0 ? "7px" : "10px",
                height: piece.id % 3 === 0 ? "16px" : "8px",
                borderRadius: piece.id % 4 === 0 ? "9999px" : "2px",
                background: piece.color,
                transform: `rotate(${piece.rotation})`,
                opacity: 0,
                animation: `locationReachedConfetti ${piece.duration} cubic-bezier(0.18, 0.82, 0.28, 1) ${piece.delay} 2`,
                "--confetti-burst-x": piece.burstX,
                "--confetti-burst-y": piece.burstY,
                "--confetti-fall-x": piece.fallX,
                "--confetti-fall-y": piece.fallY,
              }}
            />
          ))}
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(900px, 92vw)",
              minHeight: "min(360px, 70vh)",
              borderRadius: "14px",
              border: "3px solid #2f7d3a",
              background: "#102215",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: "clamp(44px, 8vw, 96px)",
              fontWeight: 1000,
              letterSpacing: "0.04em",
            }}
          >
            LOCATION REACHED
          </div>
        </div>
      ) : null}
    </div>
  );
}
