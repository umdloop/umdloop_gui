"use client";

import React, { useState, Fragment} from 'react';

import ROSLIB from "roslib";

export const modes = ["Simulation", "Cameras", "Sensors", "ROS2 Entities", "Navigation", "Mission"];
export const icons = ["simulation.png", "camera.png", "sensor.png", "ros2.png", "navigation.png", "mission.png"];
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

function Subsystem( {selectedSubsystem, setSelectedSubsystem} ) {
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [selectedButton, setSelectedButton] = useState(0);
  let buttonColor;

  return (
    <div style= {{
      verticalAlign: "middle", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "start",
      justifyContent: "center", 
      minHeight: "100vh", 
      gap: "20px", 
      marginTop: "-100px", 
      marginLeft: "-50px"}}>
        {subsystems.map((subsystem, idx) => {
            if (hoveredButtonId === idx) {
              buttonColor = "#960303ff";
            } else if (selectedButton === idx) {
              buttonColor = "#530000ff";
            } else {
              buttonColor = "#c90202ff";
            }
            return(
            <div 
              key={subsystem} 
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
                setSelectedSubsystem(subsystem),
                setSelectedButton(idx)
              }}
              >
              <span style={{fontFamily: "Arial Black", color: "white", fontSize: "20px"}}>{subsystem}</span>
            </div>
          );
        })}
    </div>
  );
}

function PageContent( {selectedMode, selectedSubsystem} ) {
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
    return <Navigation selectedSubsystem={selectedSubsystem} />;
  }
  else if (selectedMode === "Mission") {
    return <Mission selectedSubsystem={selectedSubsystem} />;
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
  const ros = new ROSLIB.Ros({ url: "ws://localhost:9090" });
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

function Navigation( {selectedSubsystem} ) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>{selectedSubsystem} - Navigation Mode</h1>
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
  const [selectedMode, setSelectedMode] = useState(modes[0]);
  const [selectedSubsystem, setSelectedSubsystem] = useState(subsystems[0]);
  return(
    <div>
    <div>
      <NavigationBar selectedMode={selectedMode} setSelectedMode={setSelectedMode} />
      <div style={{ display: "flex", flexDirection: "row", width: "100%", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ flex: "0 0 420px" }}>
          <Subsystem selectedSubsystem={selectedSubsystem} setSelectedSubsystem={setSelectedSubsystem} />
        </div>
        <div style={{ flex: 1, padding: "40px", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <PageContent selectedMode={selectedMode} selectedSubsystem={selectedSubsystem} />
        </div>
      </div>
    </div>
    </div>
  )

}