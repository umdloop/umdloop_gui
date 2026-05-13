"use client";

import React, { useState } from "react";

export default function RosCommandPanel() {
  const [rosCommand, setRosCommand] = useState("");
  const [rosCommandStatus, setRosCommandStatus] = useState("");

  const onRosCommandSubmit = () => {
    const command = rosCommand.trim();

    if (!command) {
      setRosCommandStatus("Enter a ROS2 command first");
      return;
    }

    setRosCommandStatus(`Ready to send: ${command}`);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "min(760px, 100%)",
          padding: "18px 20px",
          borderRadius: "14px",
          border: "2px solid #1f1e1eff",
          background: "#2b2b2b",
          color: "white",
          display: "grid",
          gap: "12px",
        }}
      >
        <h2 style={{ margin: 0 }}>ROS2 Command</h2>
        <textarea
          value={rosCommand}
          onChange={(e) => {
            setRosCommand(e.target.value);
            setRosCommandStatus("");
          }}
          placeholder="ros2 topic pub /cmd_vel geometry_msgs/msg/Twist '{linear: {x: 0.0}, angular: {z: 0.0}}'"
          rows={8}
          style={{
            width: "100%",
            resize: "vertical",
            minHeight: "160px",
            padding: "12px",
            borderRadius: "10px",
            border: "2px solid #1f1e1eff",
            background: "#3d3d3d",
            color: "white",
            outline: "none",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center" }}>
          <div style={{ color: rosCommandStatus.startsWith("Ready") ? "#d8d8d8" : "#ffb3b3", fontWeight: 700 }}>
            {rosCommandStatus}
          </div>
          <button
            onClick={onRosCommandSubmit}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "2px solid #1f1e1eff",
              background: "#3d3d3d",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Send Command
          </button>
        </div>
      </div>
    </div>
  );
}
