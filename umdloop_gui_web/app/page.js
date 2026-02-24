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


function PageContent({ selectedMode, selectedSubsystem, selectedNavItem, setSelectedNavItem }) {
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
    return <ROS2Entities selectedSubsystem={selectedSubsystem} />;
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

function Cameras( {selectedSubsystem}) {

  // Dummy ids
  const cameraIds = {
    "Drive": [0, 1],
    "Arm": [2],
    "Science": [3, 4]
  }

  for (const [subsystem, ids] of Object.entries(cameraIds)) {
    if (subsystem === selectedSubsystem) {
      return (
        <div>
          <h1>{subsystem} - Cameras Mode</h1>
          <div style={{ display: "flex", gap: "20px" }}>
            {ids.map((id) => (
              <div key={id} style={{ textAlign: "center" }}>
                <h2>Camera {id}</h2>
                <img
                  src={`http://localhost:5000/camera/${id}`}
                  alt={`Camera ${id}`}
                  style={{ width: "200px", height: "150px" }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
}

function Sensors( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - Sensors Mode</h1>
    </div>
  );
}

function ROS2Entities( {selectedSubsystem} ) {
  const map = new Map();
  const ros = new ROSLIB.Ros({ url: getRosbridgeUrl() });
  const subscription_topics = [""];
  const subscription_msg_type = [""];
  const publisher_topics = [""];
  const publisher_msg_type = [""];

  if(selectedSubsystem === "Arm") {
    const subscription_topics = ["/joint_states", "/controller_input", "/can_tx", "/can_rx"];
    const subscription_msg_type = ["sensor_msgs/msg/JointState", "sensor_msgs/msg/Joy", "umdloop_theseus_can_messages/msg/CANA", "umdloop_theseus_can_messages/msg/CANA"];
    const publisher_topics = ["/velocity_controller/commands"];
    const publisher_msg_type = ["std_msgs/msg/Float64MultiArray"];
  } else if (selectedSubsystem === "Drive") {
    const subscription_topics = ["/cmd_vel", "/odom"];
    const subscription_msg_type = ["geometry_msgs/msg/Twist", "nav_msgs/msg/Odometry"];
    const publisher_topics = ["/cmd_vel"];
    const publisher_msg_type = ["geometry_msgs/msg/Twist"];
  } else if (selectedSubsystem === "Science") {
    const subscription_topics = [""];
    const subscription_msg_type = [""];
    const publisher_topics = [""];
    const publisher_msg_type = [""];
  }

  for (let i = 0; i < subscription_topics.length; i++) {
    map.set(subscription_topics[i], subscription_msg_type[i]);
  }

  var ros_connection_status = "connecting...";

  // When the Rosbridge server connects, fill the span with id "status" with "successful"
  ros.on("connection", () => {
    ros_connection_status = "successful";
  });

  // When the Rosbridge server experiences an error, fill the "status" span with the returned error
  ros.on("error", (error) => {
    ros_connection_status = `errored out (${error})`;
  });

  // When the Rosbridge server shuts down, fill the "status" span with "closed"
  ros.on("close", () => {
    ros_connection_status = "closed";
  });


  // Create a listeners for each topic in subscription_topics
  subscription_topics.forEach((topic, index) => {
    const listeners = new ROSLIB.Topic({
      ros,
      name: topic,
      messageType: subscription_msg_type[index],
    });

    // When we receive a message on /my_topic, add its data as a list item to the "messages" ul
    listeners.subscribe((message) => {
      const ul = document.getElementById("messages");
      const newMessage = document.createElement("li");
      newMessage.appendChild(document.createTextNode(message.data));
      ul.appendChild(newMessage);
    });
  });



  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - ROS2 Entities Mode</h1>
      <p>Connection status: <span id="status">{ros_connection_status}</span></p>
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
          />
        </div>
      </div>
    </div>
    </div>
  )

}
