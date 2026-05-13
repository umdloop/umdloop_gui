"use client";

import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import { getRosbridgeUrl } from "../config";

/**
 * Shared hook for ROS WebSocket setup and topic subscription.
 * Extracts the common pattern used in TechnicianDashboard and OperationsWall.
 *
 * @param {Object} options
 * @param {Array<{name: string, messageType: string, callback: function}>} options.topics - Topics to subscribe to
 * @param {string} [options.url] - Optional custom rosbridge URL (defaults to getRosbridgeUrl())
 * @returns {{ rosStatus: string, rosRef: React.MutableRefObject }}
 */
export default function useRosConnection({ topics = [], url } = {}) {
  const [rosStatus, setRosStatus] = useState("connecting...");
  const rosRef = useRef(null);

  useEffect(() => {
    const rosbridgeUrl = url || getRosbridgeUrl();
    const ros = new ROSLIB.Ros({ url: rosbridgeUrl });
    rosRef.current = ros;

    ros.on("connection", () => setRosStatus("connected"));
    ros.on("error", () => setRosStatus("error"));
    ros.on("close", () => setRosStatus("disconnected"));

    const subscriptions = topics.map((topicConfig) => {
      const topic = new ROSLIB.Topic({
        ros,
        name: topicConfig.name,
        messageType: topicConfig.messageType,
      });
      topic.subscribe(topicConfig.callback);
      return topic;
    });

    return () => {
      subscriptions.forEach((topic) => topic.unsubscribe());
      if (rosRef.current === ros) {
        rosRef.current = null;
      }
      ros.close();
    };
  }, []);

  return { rosStatus, rosRef };
}
