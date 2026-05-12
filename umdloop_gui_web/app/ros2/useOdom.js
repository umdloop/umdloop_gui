"use client";

/**
 * Hook for subscribing to /localization/odom and extracting position + velocity.
 */

import { useMemo } from "react";
import useRosTopic from "./useRosTopic";
import { GUI_REQUIRED_TOPICS } from "../config";

/**
 * Subscribe to the localization odometry topic.
 * @returns {{ position: {x,y,z}|null, velocity: {linear:{x,y,z}, angular:{x,y,z}}|null, connected: boolean }}
 */
export default function useOdom() {
  const { name, messageType } = GUI_REQUIRED_TOPICS.localizationOdom;
  const { message, connected } = useRosTopic(name, messageType);

  const position = useMemo(() => {
    if (!message?.pose?.pose?.position) return null;
    const p = message.pose.pose.position;
    return { x: p.x, y: p.y, z: p.z };
  }, [message]);

  const velocity = useMemo(() => {
    if (!message?.twist?.twist) return null;
    const t = message.twist.twist;
    return {
      linear: { x: t.linear.x, y: t.linear.y, z: t.linear.z },
      angular: { x: t.angular.x, y: t.angular.y, z: t.angular.z },
    };
  }, [message]);

  return { position, velocity, connected };
}
