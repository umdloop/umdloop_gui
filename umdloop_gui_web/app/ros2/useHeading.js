"use client";

/**
 * Hook for subscribing to /heading and returning the rover heading in degrees.
 */

import useRosTopic from "./useRosTopic";
import { GUI_REQUIRED_TOPICS } from "../config";

/**
 * Subscribe to the heading topic.
 * @returns {{ heading: number|null, connected: boolean }}
 */
export default function useHeading() {
  const { name, messageType } = GUI_REQUIRED_TOPICS.heading;
  const { message, connected } = useRosTopic(name, messageType);

  const heading = message?.data ?? null;

  return { heading, connected };
}
