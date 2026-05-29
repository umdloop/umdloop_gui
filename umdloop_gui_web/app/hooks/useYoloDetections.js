"use client";

import { useMemo, useRef, useState } from "react";
import useRosConnection from "./useRosConnection";
import { yoloDetectionsTopic, OBJECT_CLASS_TOPIC, YOLO_CAMERA_MAP } from "../config";

/**
 * Picks the highest-confidence detection matching `goalClass` from a
 * vision_msgs/Detection2DArray. Coordinates are normalized to [0, 1] of the
 * source image (see yolo_ros_node.py), so they map onto any display size.
 */
function pickGoalBox(detections, goalClass) {
  let best = null;
  for (const det of detections || []) {
    const hyp = det.results?.[0]?.hypothesis;
    if (!hyp) continue;
    const score = hyp.score ?? 0;
    if (goalClass && hyp.class_id !== goalClass) continue;
    if (!best || score > best.score) {
      const center = det.bbox?.center?.position ?? {};
      best = {
        label: hyp.class_id,
        score,
        box: {
          nx: center.x ?? 0,
          ny: center.y ?? 0,
          nw: det.bbox?.size_x ?? 0,
          nh: det.bbox?.size_y ?? 0,
        },
      };
    }
  }
  return best;
}

/**
 * Subscribes (via rosbridge) to the latched /object_class topic and the
 * per-camera YOLO detection topics, and exposes the best goal-class box for
 * each YOLO camera index.
 *
 * @returns {{
 *   goalClass: string,
 *   boxesByIndex: Object,   // { [yoloIndex]: { box, label, score } | null }
 *   firstHitIndex: number|null,  // lowest index currently reporting a goal hit
 *   indices: number[],
 *   rosStatus: string,
 * }}
 */
export default function useYoloDetections() {
  const [goalClass, setGoalClass] = useState("");
  const [boxesByIndex, setBoxesByIndex] = useState({});

  // Read inside detection callbacks without re-subscribing when the goal changes.
  const goalClassRef = useRef("");
  goalClassRef.current = goalClass;

  const indices = useMemo(
    () => Object.keys(YOLO_CAMERA_MAP).map(Number).sort((a, b) => a - b),
    []
  );

  const topics = useMemo(() => {
    const list = [
      { ...OBJECT_CLASS_TOPIC, callback: (msg) => setGoalClass(msg?.data ?? "") },
    ];
    for (const idx of indices) {
      list.push({
        ...yoloDetectionsTopic(idx),
        callback: (msg) => {
          const hit = pickGoalBox(msg?.detections, goalClassRef.current);
          setBoxesByIndex((prev) => {
            if (!hit && !prev[idx]) return prev; // nothing changed; skip re-render
            return { ...prev, [idx]: hit };
          });
        },
      });
    }
    return list;
    // indices is stable for the component lifetime
  }, [indices]);

  const { rosStatus } = useRosConnection({ topics });

  const firstHitIndex = indices.find((idx) => boxesByIndex[idx]) ?? null;

  return { goalClass, boxesByIndex, firstHitIndex, indices, rosStatus };
}
