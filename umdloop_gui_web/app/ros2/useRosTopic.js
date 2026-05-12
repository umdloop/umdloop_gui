"use client";

/**
 * Generic hook for subscribing to a ROS2 topic via roslib.
 *
 * Usage:
 *   const msg = useRosTopic("/gps/fix", "sensor_msgs/msg/NavSatFix");
 */

import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import { getRosbridgeUrl } from "../config";

/**
 * Subscribe to a single ROS topic and return the latest message.
 * @param {string} topicName - e.g. "/gps/fix"
 * @param {string} messageType - e.g. "sensor_msgs/msg/NavSatFix"
 * @param {object} [options]
 * @param {string} [options.url] - Override rosbridge URL
 * @returns {{ message: object|null, connected: boolean }}
 */
export default function useRosTopic(topicName, messageType, options = {}) {
  const [message, setMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const rosRef = useRef(null);

  const url = options.url || getRosbridgeUrl();

  useEffect(() => {
    if (!topicName || !messageType) return;

    const ros = new ROSLIB.Ros({ url });
    rosRef.current = ros;

    ros.on("connection", () => setConnected(true));
    ros.on("error", () => setConnected(false));
    ros.on("close", () => setConnected(false));

    const topic = new ROSLIB.Topic({
      ros,
      name: topicName,
      messageType,
    });

    topic.subscribe((msg) => {
      setMessage(msg);
    });

    return () => {
      topic.unsubscribe();
      ros.close();
      rosRef.current = null;
    };
  }, [topicName, messageType, url]);

  return { message, connected };
}
