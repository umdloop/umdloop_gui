"use client";

import React, { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import CameraFeed from "../../components/camera/CameraFeed";
import CameraManagerModal from "../../components/camera/CameraManagerModal";
import { CAMERA_ROLES, EQUIPMENT_OPERATOR_COMMAND_TOPICS, getRosbridgeUrl } from "../../config";

const EQUIPMENT_CAMERAS = [
  { label: "Equipment Cam 1", role: CAMERA_ROLES.SCIENCE_1 },
  { label: "Equipment Cam 2", role: CAMERA_ROLES.SCIENCE_2 },
  { label: "Equipment Cam 3", role: CAMERA_ROLES.SCIENCE_3 },
  { label: "Equipment Cam 4", role: null },
  { label: "Equipment Cam 5", role: null },
];

const CONTROLLERS = {
  cls: "conveyor_belt_cls_controller",
  science: "science_controller",
};

export default function EquipmentOperatorView() {
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [activeController, setActiveController] = useState(CONTROLLERS.science);
  const [clsAngle, setClsAngle] = useState("1.0");
  const [equipmentStatus, setEquipmentStatus] = useState("connecting...");
  const rosRef = useRef(null);

  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
    rosRef.current = ros;

    ros.on("connection", () => {
      setEquipmentStatus(`connected - ${CONTROLLERS.science} selected`);
    });
    ros.on("error", () => setEquipmentStatus("error"));
    ros.on("close", () => setEquipmentStatus("disconnected"));

    return () => {
      if (rosRef.current === ros) {
        rosRef.current = null;
      }
      ros.close();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setFullscreenCam(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const publishOnce = (topicConfig, payload) => {
    if (!rosRef.current) {
      throw new Error("ROS is not connected");
    }

    const topic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: topicConfig.name,
      messageType: topicConfig.messageType,
    });

    topic.publish(new ROSLIB.Message(payload));
  };

  const switchControllers = (nextController) => new Promise((resolve, reject) => {
    if (!rosRef.current) {
      reject(new Error("ROS is not connected"));
      return;
    }

    const service = new ROSLIB.Service({
      ros: rosRef.current,
      name: EQUIPMENT_OPERATOR_COMMAND_TOPICS.controllerSwitchService.name,
      serviceType: EQUIPMENT_OPERATOR_COMMAND_TOPICS.controllerSwitchService.serviceType,
    });

    const deactivateControllers = Object.values(CONTROLLERS).filter((controller) => controller !== nextController);

    service.callService(
      new ROSLIB.ServiceRequest({
        activate_controllers: [nextController],
        deactivate_controllers: deactivateControllers,
        strictness: 2,
        activate_asap: false,
        timeout: { sec: 5, nanosec: 0 },
      }),
      (response) => {
        if (response?.ok === false) {
          reject(new Error("controller switch rejected"));
          return;
        }
        resolve(response);
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error)))
    );
  });

  const handleControllerSelect = async (nextController) => {
    if (nextController === activeController) {
      return;
    }

    setEquipmentStatus(`switching to ${nextController}...`);

    try {
      await switchControllers(nextController);
      setActiveController(nextController);
      setEquipmentStatus(`${nextController} active`);
    } catch (error) {
      setEquipmentStatus(`switch failed: ${error.message}`);
    }
  };

  const handleAngleUpdate = () => {
    const nextAngle = Number(clsAngle);
    if (!Number.isFinite(nextAngle)) {
      setEquipmentStatus("publish failed: enter a valid angle");
      return;
    }

    try {
      publishOnce(EQUIPMENT_OPERATOR_COMMAND_TOPICS.conveyorAngleReference, { data: nextAngle });
      setEquipmentStatus(`published ${nextAngle} deg`);
    } catch (error) {
      setEquipmentStatus(`publish failed: ${error.message}`);
    }
  };

  const clsActive = activeController === CONTROLLERS.cls;

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr)", gap: "8px", padding: "10px", height: "100%", minHeight: 0, background: "#1a1a1a" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowCameraManager(true)}
          style={{
            borderRadius: "9999px",
            border: "2px solid #0f2f55",
            background: "#1a3f6f",
            color: "white",
            cursor: "pointer",
            padding: "7px 16px",
            fontSize: "12px",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          Camera Manager
        </button>
      </div>

      <div style={{ border: "2px solid #4a4a4a", borderRadius: "10px", background: "#262626", padding: "10px 12px", display: "grid", gap: "10px" }}>
        <div style={{ color: "#d9d9d9", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Conveyor Belt CLS Control
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 220px))", gap: "8px" }}>
          <button
            onClick={() => handleControllerSelect(CONTROLLERS.cls)}
            style={{
              borderRadius: "8px",
              border: clsActive ? "1px solid #1d6b35" : "1px solid #555",
              background: clsActive ? "#1f7a1f" : "#303030",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              padding: "10px 12px",
            }}
          >
            CLS Controller
          </button>
          <button
            onClick={() => handleControllerSelect(CONTROLLERS.science)}
            style={{
              borderRadius: "8px",
              border: !clsActive ? "1px solid #1d6b35" : "1px solid #555",
              background: !clsActive ? "#1f7a1f" : "#303030",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              padding: "10px 12px",
            }}
          >
            Science Controller
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) 140px", gap: "8px", alignItems: "center" }}>
          <input
            type="number"
            step="0.1"
            value={clsAngle}
            onChange={(event) => setClsAngle(event.target.value)}
            disabled={!clsActive}
            style={{
              borderRadius: "8px",
              border: "1px solid #555",
              background: clsActive ? "#2f2f2f" : "#1f1f1f",
              color: clsActive ? "white" : "#888",
              padding: "10px 12px",
              fontWeight: 700,
              width: "100%",
            }}
          />
          <button
            onClick={handleAngleUpdate}
            disabled={!clsActive}
            style={{
              borderRadius: "8px",
              border: "1px solid #555",
              background: clsActive ? "#1a3f6f" : "#1f1f1f",
              color: clsActive ? "white" : "#888",
              cursor: clsActive ? "pointer" : "not-allowed",
              fontWeight: 800,
              padding: "10px 12px",
            }}
          >
            Update
          </button>
        </div>
        <div style={{ display: "grid", gap: "4px", color: "#d8d8d8", fontSize: "15px" }}>
          <div>Status: <b>{equipmentStatus}</b></div>
          <div>Switch service: <b>{EQUIPMENT_OPERATOR_COMMAND_TOPICS.controllerSwitchService.name}</b></div>
          <div>Reference topic: <b>{EQUIPMENT_OPERATOR_COMMAND_TOPICS.conveyorAngleReference.name}</b></div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          minHeight: 0,
        }}
      >
        {EQUIPMENT_CAMERAS.map((cam) => (
          <CameraFeed
            key={cam.label}
            role={cam.role}
            label={cam.label}
            onClick={() => setFullscreenCam(cam)}
            style={{ width: "100%", height: "100%", cursor: "pointer", border: "1px solid #3d3d3d" }}
          />
        ))}
      </div>

      {fullscreenCam && (
        <div
          onClick={() => setFullscreenCam(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>{fullscreenCam.label}</h2>
          <CameraFeed
            role={fullscreenCam.role}
            label={fullscreenCam.label}
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              width: "min(1280px, 96vw)",
              height: "80vh",
              borderRadius: "12px",
              background: "black",
            }}
          />
        </div>
      )}

      {showCameraManager && <CameraManagerModal onClose={() => setShowCameraManager(false)} />}
    </div>
  );
}
