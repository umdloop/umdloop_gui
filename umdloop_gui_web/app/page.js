"use client";

import React, { useState,useEffect, Fragment} from 'react';


import ROSLIB from "roslib";
import MapView from "./MapView";
import { getRosbridgeUrl } from "./config";

export const modes = ["Simulation", "Cameras", "Sensors", "ROS2 Entities", "Navigation", "Mission", "Map"];
export const icons = ["simulation.png", "camera.png", "sensor.png", "ros2.png", "navigation.png", "mission.png", "navigation.png"];
export const subsystems = ["Drive", "Arm", "Science"];

function NavigationBar( {selectedMode, setSelectedMode} ) {
    const [hoveredButtonId, setHoveredButtonId] = useState(null);
    const [selectedButton, setSelectedButton] = useState(0);
    let buttonColor;
    return (
        <nav style={{
          display: "flex",
          justifyContent: "flex-start",
          background: "#3d3d3d"}}>
            <button key="loop" style={{
              background: "none",
              border: "none",
              cursor: "pointer" }}>
                <img src="/loop.png" alt="loop" style={{width: "220px", height: "40px", paddingLeft: "20px", paddingRight: "20px"}} />
            </button>
            {icons.map((mode, idx) => {
              if (hoveredButtonId === idx) {
                buttonColor = "#353535ff";
              } else if (selectedButton === idx) {
                buttonColor = "#262626ff";
              } else {
                buttonColor = "#3d3d3d";
              }
              return(
                <Fragment key={mode}>
                  {idx < icons.length && <div style={{ width: "5px", background: "#1f1e1eff"}}></div>}
                  <button
                    key={mode}
                    style={{
                      background: buttonColor,
                      paddingRight: "100px",
                      paddingLeft: "100px",
                      paddingTop: "10px",
                      paddingBottom: "10px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHoveredButtonId(idx)}
                    onMouseLeave={() => setHoveredButtonId(null)}
                    onClick={() => {
                      setSelectedMode(modes[idx])
                      setSelectedButton(idx)
                    }}
                  >
                    <img src={`/${mode}`} alt={mode.replace('.png', '')} style={{ width: "50px", height: "50px" }} />
                    <span style={{ color: "white", fontSize: "12px" }}>{modes[idx]}</span>
                  </button>
                </Fragment>
              );
            })}
            <div style={{ width: "5px", background: "#1f1e1eff" }}></div>
            <div style={{paddingRight: "50px"}}></div>
        </nav>
    );
}

function Subsystem({ buttons, selected, setSelected }) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [selectedButton, setSelectedButton] = useState(0);
  let buttonColor;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      justifyContent: "center",
      minHeight: "100vh",
      gap: "20px",
      marginTop: "-100px",
      marginLeft: "-50px",
    }}>
      {buttons.map((label, idx) => {
        if (hoveredButtonId === idx) {
          buttonColor = "#960303ff";
        } else if (selectedButton === idx) {
          buttonColor = "#530000ff";
        } else {
          buttonColor = "#c90202ff";
        }

        return (
          <div
            key={label}
            style={{
              background: buttonColor,
              border: "2px solid #360101ff",
              width: "400px",
              height: "80px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onMouseEnter={() => setHoveredButtonId(idx)}
            onMouseLeave={() => setHoveredButtonId(null)}
            onClick={() => {
              setSelected(label);
              setSelectedButton(idx);
            }}
          >
            <span style={{ fontFamily: "Arial Black", color: "white", fontSize: "20px" }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function PageContent({ selectedMode, selectedSubsystem, selectedNavItem, setSelectedNavItem, sharedRos, setSharedRos }) {
  if (selectedMode === "Cameras") {
    return <Cameras selectedSubsystem={selectedSubsystem} />;
  }
  else if (selectedMode === "Simulation") {
    return <Simulation selectedSubsystem={selectedSubsystem} />;
  }
  else if (selectedMode === "Sensors") {
    return <Sensors selectedSubsystem={selectedSubsystem} />;
  }
  else if (selectedMode === "ROS2 Entities") {
    return <ROS2Entities
        selectedSubsystem={selectedSubsystem}
        sharedRos={sharedRos}
        setSharedRos={setSharedRos}
      />;
  }
  else if (selectedMode === "Navigation") {
    return <Navigation selectedNavItem={selectedNavItem} />;
  }
  else if (selectedMode === "Mission") {
    return <Mission selectedSubsystem={selectedSubsystem} />;
  }
  else if (selectedMode === "Map") {
    return <MapView selectedSubsystem={selectedSubsystem} />;
  }
}

function Simulation( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h2>{selectedSubsystem} - Simulation Mode</h2>
    </div>
  );
}

function Cameras({ selectedSubsystem }) {
  const [fullscreenGroup, setFullscreenGroup] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setFullscreenGroup(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const cameraIds = {
    Drive: { "Top Left Wheel": [0, 1], "Top Right Wheel": [2, 3], "Bottom Left Wheel": [4, 5], "Bottom Right Wheel": [6, 7], 
             "Front of the robot": [15] },
    Arm: { "Base of Arm": [8], "Joint of Arm": [9], "End Effector": [10, 11] },
    Science: { "Science Cam 1": [12], "Science Cam 2": [13], "Science Cam 3": [14] },
  };

  const subsystemData = cameraIds[selectedSubsystem];
  if (!subsystemData) return null;

  return (
    <div className="py-4 text-white max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Header text black and centered */}
      <h2 className="text-2xl font-semibold text-black text-center mb-6">
        {selectedSubsystem} – Cameras Mode
      </h2>


      {/* DRIVE */}
      {selectedSubsystem === "Drive" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Front of the Robot - large box */}
          <div
            onClick={() =>
              setFullscreenGroup({ label: "Front of the robot", cams: subsystemData["Front of the robot"] })
            }
            className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 shadow-md cursor-pointer hover:bg-zinc-800 hover:scale-[1.02] transition
                      lg:row-span-2"
          >
            <h2 className="text-xl font-bold mb-3 text-center">Front of the robot</h2>
            <img
              src={`http://localhost:5000/camera/${subsystemData["Front of the robot"][0]}`}
              alt="Front of the robot"
              className="w-full h-[450px] object-cover rounded-lg bg-black"
            />
            <p className="text-center mt-2 opacity-80">Camera {subsystemData["Front of the robot"][0]}</p>
          </div>

          {/* Other four drive cameras */}
          {Object.entries(subsystemData)
            .filter(([label]) => label !== "Front of the robot")
            .map(([label, cams]) => (
              <div
                key={label}
                onClick={() => setFullscreenGroup({ label, cams })}
                className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-md cursor-pointer hover:bg-zinc-800 hover:scale-[1.02] transition"
              >
                <h2 className="text-xl font-bold mb-3 text-center">{label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cams.map((id) => (
                    <div key={id} className="flex flex-col items-center">
                      <img
                        src={`http://localhost:5000/camera/${id}`}
                        alt={`Camera ${id}`}
                        className="w-full h-56 object-cover rounded-lg bg-black"
                      />
                      <p className="text-sm mt-2 opacity-80">Camera {id}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}


      {/* ARM */}
      {selectedSubsystem === "Arm" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(subsystemData).slice(0, 2).map(([label, cams]) => (
            <div
              key={label}
              onClick={() => setFullscreenGroup({ label, cams })}
              className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-md cursor-pointer hover:bg-zinc-800 hover:scale-[1.02] transition"
            >
              <h2 className="text-xl font-bold mb-3 text-center">{label}</h2>
              <img src={`http://localhost:5000/camera/${cams[0]}`} alt={`Camera ${cams[0]}`} className="w-full h-60 object-cover rounded-lg bg-black" />
              <p className="text-center mt-2 opacity-80">Camera {cams[0]}</p>
            </div>
          ))}

          <div
            onClick={() => setFullscreenGroup({ label: "End Effector", cams: subsystemData["End Effector"] })}
            className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-md cursor-pointer hover:bg-zinc-800 hover:scale-[1.02] transition lg:col-span-2"
          >
            <h2 className="text-xl font-bold mb-4 text-center">End Effector</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subsystemData["End Effector"].map((id) => (
                <div key={id} className="flex flex-col items-center">
                  <img src={`http://localhost:5000/camera/${id}`} alt={`Camera ${id}`} className="w-full h-56 object-cover rounded-lg bg-black" />
                  <p className="text-sm mt-2 opacity-80">Camera {id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SCIENCE */}
      {selectedSubsystem === "Science" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(subsystemData).map(([label, cams]) => (
            <div
              key={label}
              onClick={() => setFullscreenGroup({ label, cams })}
              className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-md cursor-pointer hover:bg-zinc-800 hover:scale-[1.02] transition"
            >
              <h2 className="text-xl font-bold mb-4 text-center">{label}</h2>
              <img src={`http://localhost:5000/camera/${cams[0]}`} alt={`Camera ${cams[0]}`} className="w-full h-60 object-cover rounded-lg bg-black" />
              <p className="text-center mt-2 opacity-80">Camera {cams[0]}</p>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN OVERLAY */}
      {fullscreenGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100]" onClick={() => setFullscreenGroup(null)}>
          <div className="bg-zinc-900 p-6 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-center">{fullscreenGroup.label}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fullscreenGroup.cams.map((id) => (
                <div key={id} className="flex flex-col items-center">
                  <img src={`http://localhost:5000/camera/${id}`} alt={`Camera ${id}`} className="w-full max-h-[60vh] object-contain rounded-lg bg-black" />
                  <p className="text-sm mt-2 opacity-80">Camera {id}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-6 opacity-60">(Click outside or press ESC to exit)</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Sensors( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - Sensors Mode</h1>
    </div>
  );
}

function ROS2Entities({ selectedSubsystem, sharedRos, setSharedRos }) {
  const [rosStatus, setRosStatus] = useState("connecting...");
  const [messages, setMessages] = useState([]);
  const [rosInstance, setRosInstance] = useState(null);

  // Publisher state
  const [pubTopic, setPubTopic] = useState("/cmd_vel");
  const [pubMessageType, setPubMessageType] = useState("geometry_msgs/msg/Twist");
  const [pubPayload, setPubPayload] = useState('{\n  "linear": {"x": 0.0, "y": 0.0, "z": 0.0},\n  "angular": {"x": 0.0, "y": 0.0, "z": 0.0}\n}');
  const [publishStatus, setPublishStatus] = useState("");

  useEffect(() => {
    const ros = sharedRos || new ROSLIB.Ros({ url: "ws://localhost:9090" });
    setRosInstance(ros);
    if (!sharedRos) setSharedRos(ros);

    ros.on("connection", () => setRosStatus("✅ connected"));
    ros.on("error", (error) => setRosStatus(`❌ error: ${error}`));
    ros.on("close", () => setRosStatus("🔴 closed"));

    let subscription_topics = [];
    let subscription_msg_type = [];

    if (selectedSubsystem === "Arm") {
      subscription_topics = ["/joint_states", "/controller_input", "/can_tx", "/can_rx"];
      subscription_msg_type = [
        "sensor_msgs/msg/JointState",
        "sensor_msgs/msg/Joy",
        "umdloop_athena_can_messages/msg/CANA",
        "umdloop_athena_can_messages/msg/CANA",
      ];
    } else if (selectedSubsystem === "Drive") {
      subscription_topics = ["/cmd_vel", "/odom"];
      subscription_msg_type = ["geometry_msgs/msg/Twist", "nav_msgs/msg/Odometry"];
    }

    const listeners = subscription_topics.map((topic, i) => {
      const listener = new ROSLIB.Topic({ ros, name: topic, messageType: subscription_msg_type[i] });
      listener.subscribe((msg) => {
        setMessages((prev) => [
          { topic, msg: JSON.stringify(msg, null, 2) },
          ...prev.slice(0, 20),
        ]);
      });
      return listener;
    });

    return () => {
      listeners.forEach((l) => l.unsubscribe());
      ros.close();
    };
  }, [selectedSubsystem]);

  const publishMessage = () => {
    if (!rosInstance) {
      setPublishStatus("❌ ROS not connected");
      return;
    }

    try {
      const message = JSON.parse(pubPayload);
      const topic = new ROSLIB.Topic({
        ros: rosInstance,
        name: pubTopic,
        messageType: pubMessageType,
      });

      topic.publish(new ROSLIB.Message(message));
      setPublishStatus(`✅ Published to ${pubTopic}`);

      // Clear status after 3 seconds
      setTimeout(() => setPublishStatus(""), 3000);
    } catch (error) {
      setPublishStatus(`❌ Error: ${error.message}`);
    }
  };

  const loadPreset = (preset) => {
    const presets = {
      cmd_vel: {
        topic: "/cmd_vel",
        type: "geometry_msgs/msg/Twist",
        payload: '{\n  "linear": {"x": 0.5, "y": 0.0, "z": 0.0},\n  "angular": {"x": 0.0, "y": 0.0, "z": 0.0}\n}'
      },
      stop: {
        topic: "/cmd_vel",
        type: "geometry_msgs/msg/Twist",
        payload: '{\n  "linear": {"x": 0.0, "y": 0.0, "z": 0.0},\n  "angular": {"x": 0.0, "y": 0.0, "z": 0.0}\n}'
      },
      joint_states: {
        topic: "/joint_states",
        type: "sensor_msgs/msg/JointState",
        payload: '{\n  "name": ["joint1", "joint2"],\n  "position": [0.0, 0.0],\n  "velocity": [0.0, 0.0],\n  "effort": [0.0, 0.0]\n}'
      },
      nav_goal: {
        topic: "/goal_pose",
        type: "geometry_msgs/msg/PoseStamped",
        payload: '{\n  "header": {"frame_id": "map"},\n  "pose": {\n    "position": {"x": 0.0, "y": 0.0, "z": 0.0},\n    "orientation": {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0}\n  }\n}'
      }
    };

    if (presets[preset]) {
      setPubTopic(presets[preset].topic);
      setPubMessageType(presets[preset].type);
      setPubPayload(presets[preset].payload);
    }
  };

  return (
    <div className="py-4">
      <h2 className="text-2xl font-semibold text-center">{selectedSubsystem} - ROS2 Entities Mode</h2>
      <p className="mt-2 text-center">ROS Connection: {rosStatus}</p>

      <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PUBLISH SECTION */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-xl font-bold mb-4 text-white">Publish ROS2 Command</h3>

          {/* Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">Quick Presets:</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => loadPreset('cmd_vel')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Move Forward
              </button>
              <button
                onClick={() => loadPreset('stop')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Stop
              </button>
              <button
                onClick={() => loadPreset('joint_states')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                Joint States
              </button>
              <button
                onClick={() => loadPreset('nav_goal')}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
              >
                Nav Goal
              </button>
            </div>
          </div>

          {/* Navigation Integration
          <div className="mb-4 p-3 bg-zinc-800 rounded-lg border border-zinc-600">
            <label className="block text-sm font-medium text-white mb-2">Navigation Integration:</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={sendWaypointsToNav}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex-1"
              >
                Sync Waypoints ({navigationWaypoints.length})
              </button>
              <div className="text-xs text-gray-400">
                Rover: ({Math.round(roverPosition.x)}, {Math.round(roverPosition.y)})
              </div>
            </div>
          </div> */}

          {/* Topic Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">Topic Name:</label>
            <input
              type="text"
              value={pubTopic}
              onChange={(e) => setPubTopic(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="/cmd_vel"
            />
          </div>

          {/* Message Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">Message Type:</label>
            <input
              type="text"
              value={pubMessageType}
              onChange={(e) => setPubMessageType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
              placeholder="geometry_msgs/msg/Twist"
            />
          </div>

          {/* Message Payload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">Message Payload (JSON):</label>
            <textarea
              value={pubPayload}
              onChange={(e) => setPubPayload(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              rows="10"
              placeholder='{"linear": {"x": 0.0, "y": 0.0, "z": 0.0}}'
            />
          </div>

          {/* Publish Button */}
          <button
            onClick={publishMessage}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
          >
            Publish Message
          </button>

          {/* Status */}
          {publishStatus && (
            <div className={`mt-3 p-3 rounded ${publishStatus.startsWith('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
              {publishStatus}
            </div>
          )}
        </div>

        {/* SUBSCRIBE SECTION */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-xl font-bold mb-4 text-white">Incoming Messages</h3>
          <div className="bg-black text-green-400 p-3 rounded-lg text-left h-[500px] overflow-y-scroll">
            {messages.length === 0
              ? <p className="text-zinc-500">No messages received yet...</p>
              : messages.map((m, i) => (
                  <pre key={i} className="mb-3 text-xs"><b className="text-yellow-400">{m.topic}</b> →\n{m.msg}</pre>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const NAVIGATION_BUTTONS = [
  "Object Detection",
  "Control Panel",
  "Placeholder2",
];

function Navigation({selectedNavItem}) {
  const [running, setRunning] = useState(false);
  const [pid, setPid] = useState(null);
  const [error, setError] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [navMode, setNavMode] = useState("GNSS");

  const [pathPlanStatus, setPathPlanStatus] = useState("");

  const fetchStatus = async () => {
    try {
      setError("");
      const res = await fetch("http://127.0.0.1:5000/object-detection/status");
      const data = await res.json();
      setRunning(Boolean(data.running));
      setPid(data.pid ?? null);
    } catch (e) {
      setError("Backend unreachable");
      setRunning(false);
      setPid(null);
    }
  };

  const startDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/start", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      setError("Failed to start");
    }
  };

  const stopDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/stop", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      setError("Failed to stop");
    }
  };

  const onPathPlan = async () => {
    console.log("Path plan clicked", { latitude, longitude, navMode });
    try {

      setError("");
      setPathPlanStatus("Sending...");

      const res = await fetch("http://127.0.0.1:5000/navigation/path-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          position_tolerance: 0.0,
          mode: navMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setPathPlanStatus("");
        setError(data.error || data.message || "Path plan failed");
        return;
      }

      setPathPlanStatus(data.message || "Request sent");
    } catch (e) {
      setPathPlanStatus("");
      setError("Backend unreachable");
    }
  };

  // When you enter Object Detection tab, start polling status
  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return;

    fetchStatus(); // initial fetch
    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, [selectedNavItem]);

  // Optional: auto-start when tab is selected
  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return;
    startDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNavItem]);

  return (
    <div>
      <h1>{selectedNavItem} - Navigation Mode</h1>

      {selectedNavItem === "Object Detection" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {/* Status Row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "fit-content",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                fontWeight: 800,
                background: running ? "#1f7a1f" : "#8a1f1f",
              }}
            >
              {running ? "RUNNING ✅" : "STOPPED ❌"}
            </div>

            <div style={{ opacity: 0.9 }}>
              PID: <span style={{ fontWeight: 700 }}>{pid ?? "—"}</span>
            </div>

            {error && (
              <div style={{ color: "#ffb3b3", fontWeight: 700 }}>
                {error}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={startDetection}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Start
            </button>

            <button
              onClick={stopDetection}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Stop
            </button>

            <button
              onClick={fetchStatus}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "2px solid #1f1e1eff",
                background: "#3d3d3d",
                color: "white",
                fontWeight: 800,
              }}
            >
              Refresh
            </button>
          </div>

          {/* Camera */}
          <div style={{ textAlign: "center" }}>
            <h2>Object Detection Stream</h2>
            <img
              src="http://127.0.0.1:5000/object-detection/stream/0"
              alt="Object Detection Stream"
              style={{ width: "640px", height: "480px" }}
            />
          </div>
        </div>
      )}

      {selectedNavItem === "Control Panel" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "520px",
              textAlign: "left",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Control Panel</h2>

            {/* Latitude / Longitude */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Latitude</label>
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 38.4239116"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "2px solid #1f1e1eff",
                    background: "#3d3d3d",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Longitude</label>
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. -110.7849055"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "2px solid #1f1e1eff",
                    background: "#3d3d3d",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Radio Options */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Mode</div>

              {["GNSS", "Object Detection", "Aruco Tag"].map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    border: "2px solid #1f1e1eff",
                    background: navMode === opt ? "#262626ff" : "#3d3d3d",
                    cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="radio"
                    name="navMode"
                    value={opt}
                    checked={navMode === opt}
                    onChange={() => setNavMode(opt)}
                    style={{ transform: "scale(1.2)" }}
                  />
                  <span style={{ fontWeight: 800 }}>{opt}</span>
                </label>
              ))}
            </div>

            {/* Optional: show what's selected */}
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {/* Path Plan Button */}
              <button
                onClick={onPathPlan}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "9999px",
                  border: "2px solid #1f1e1eff",
                  background: "#530000ff",
                  color: "white",
                  fontWeight: 900,
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Path Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }

function Mission( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - Mission Mode</h1>
    </div>
  );
}

export default function LoopGui() {
  console.log("🔥 LOOP GUI RENDERED");
  const [selectedMode, setSelectedMode] = useState(modes[0]);
  const [selectedSubsystem, setSelectedSubsystem] = useState(subsystems[0]);
  const [selectedNavItem, setSelectedNavItem] = useState(NAVIGATION_BUTTONS[0]);
  const [sharedRos, setSharedRos] = useState(null);
  return(
    <div>
    <div>
      <NavigationBar selectedMode={selectedMode} setSelectedMode={setSelectedMode} />
      <div style={{ display: "flex", flexDirection: "row", width: "100%", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ flex: "0 0 420px" }}>
          {
            selectedMode === "Navigation" ? (
              <Subsystem
                buttons={NAVIGATION_BUTTONS}
                selected={selectedNavItem}
                setSelected={setSelectedNavItem}
              />
            ) : (
              <Subsystem
                buttons={subsystems}
                selected={selectedSubsystem}
                setSelected={setSelectedSubsystem}
              />
            )
          }
      </div>

        <div style={{
          flex: 1,
          padding: selectedMode === "Map" ? "0" : "40px",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          display: selectedMode === "Map" ? "flex" : undefined,
          flexDirection: selectedMode === "Map" ? "column" : undefined,
        }}>
          <PageContent selectedMode={selectedMode} selectedSubsystem={selectedSubsystem}
                      selectedNavItem={selectedNavItem} setSelectedNavItem={setSelectedNavItem}
                       sharedRos={sharedRos}
            setSharedRos={setSharedRos}
          />
        </div>
      </div>
    </div>
    </div>
  )

}
