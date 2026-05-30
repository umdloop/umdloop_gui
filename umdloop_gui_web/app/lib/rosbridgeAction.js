"use client";

// Minimal ROS 2 action client over rosbridge.
//
// roslib 1.4.1 only ships the ROS 1 actionlib client (SimpleActionServer /
// ActionClient / Goal), which speaks the old goal/feedback/result *topics* —
// not the ROS 2 `send_action_goal` rosbridge op. So for the mission
// executive's `navigate_to_target` action we send the raw rosbridge ops via
// `ros.callOnConnection` and read `action_feedback` / `action_result` replies
// directly off `ros.socket` (roslib's SocketAdapter doesn't emit those ops).
//
// rosbridge_suite (ROS 2) protocol:
//   → { op: "send_action_goal", id, action, action_type, args, feedback: true }
//   ← { op: "action_feedback",  id, values }
//   ← { op: "action_result",    id, values, result, status }
//   → { op: "cancel_action_goal", id, action }

function attachRawListener(ros, handler) {
  const sock = ros?.socket;
  if (!sock) return () => {};

  const wrapped = (event) => {
    // Browser WebSocket dispatches MessageEvent; socket.io passes the data
    // straight through. Ignore non-string frames (png/bson) — actions are JSON.
    const data = event && typeof event === "object" && "data" in event ? event.data : event;
    if (typeof data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    handler(msg);
  };

  if (typeof sock.addEventListener === "function") {
    sock.addEventListener("message", wrapped);
    return () => sock.removeEventListener("message", wrapped);
  }
  // socket.io transport (node) emits parsed frames on "data".
  if (typeof sock.on === "function") {
    sock.on("data", wrapped);
    return () => sock.off?.("data", wrapped) ?? sock.removeListener?.("data", wrapped);
  }
  return () => {};
}

/**
 * Send a ROS 2 action goal over rosbridge.
 *
 * @param {ROSLIB.Ros} ros - a connected roslib Ros instance.
 * @param {Object} opts
 * @param {string} opts.action - action name, e.g. "/mission_executive/navigate_to_target".
 * @param {string} opts.actionType - action type, e.g. "msgs/action/NavigateToTarget".
 * @param {Object} [opts.args] - goal fields.
 * @param {function} [opts.onFeedback] - called with each feedback `values` object.
 * @param {function} [opts.onResult] - called once with { values, status, result }.
 * @returns {{ id: string, cancel: function, promise: Promise }}
 */
export function sendActionGoal(ros, { action, actionType, args = {}, onFeedback, onResult } = {}) {
  const id = `send_action_goal:${action}:${++ros.idCounter}`;
  let settled = false;
  let detach = () => {};

  const promise = new Promise((resolve) => {
    detach = attachRawListener(ros, (msg) => {
      if (!msg || msg.id !== id) return;
      if (msg.op === "action_feedback") {
        onFeedback?.(msg.values ?? {});
      } else if (msg.op === "action_result") {
        if (settled) return;
        settled = true;
        detach();
        const outcome = { values: msg.values ?? {}, status: msg.status, result: msg.result };
        onResult?.(outcome);
        resolve(outcome);
      }
    });

    ros.callOnConnection({
      op: "send_action_goal",
      id,
      action,
      action_type: actionType,
      args,
      feedback: true,
    });
  });

  const cancel = () => {
    if (settled) return;
    try {
      ros.callOnConnection({ op: "cancel_action_goal", id, action });
    } catch {
      /* socket gone */
    }
  };

  return { id, cancel, promise };
}
