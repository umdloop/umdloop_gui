"use client";

import { useEffect, useRef, useState } from "react";

function getCameraId(message) {
  return message?.id ?? message?.cam_id ?? message?.cameraId ?? message?.camera_id ?? message?.camera;
}

function extractCameraIds(payload) {
  const cameras = Array.isArray(payload?.cameras) ? payload.cameras : [];
  return cameras
    .map((camera) => {
      const id = camera?.id ?? camera?.camera_id ?? camera?.cam_id ?? camera;
      if (id == null) return null;
      const normalized = String(id).trim();
      return normalized || null;
    })
    .filter(Boolean);
}

function getOfferDescription(message) {
  if (typeof message?.sdp === "string") return { type: "offer", sdp: message.sdp };
  return message?.description?.sdp ? { type: "offer", sdp: message.description.sdp } : null;
}

function getIceCandidate(message) {
  if (typeof message?.candidate === "string") {
    return {
      candidate: message.candidate,
      sdpMLineIndex: message.mlineIndex ?? message.sdpMLineIndex ?? 0,
    };
  }
  return null;
}

function normalizeHookOptions(options) {
  if (typeof options === "number") {
    return { reconnectToken: options, activeCameraIds: [] };
  }

  return {
    reconnectToken: options?.reconnectToken || 0,
    activeCameraIds: Array.isArray(options?.activeCameraIds) ? options.activeCameraIds : [],
  };
}

export default function useCameraStreams(serverUrl, options = 0) {
  const { reconnectToken, activeCameraIds } = normalizeHookOptions(options);
  const [cameraIds, setCameraIds] = useState([]);
  const [streams, setStreams] = useState({});
  const [status, setStatus] = useState("connecting");
  const [lastMessage, setLastMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [debug, setDebug] = useState({
    subscriptionsSent: 0,
    unsubscriptionsSent: 0,
    offersReceived: 0,
    answersSent: 0,
    iceIn: 0,
    iceOut: 0,
    lastSent: "",
    lastSentRaw: "",
    lastReceivedRaw: "",
  });
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const subscribedCameraIdsRef = useRef(new Set());
  const activeCameraIdsRef = useRef(new Set());
  const subscribeTimersRef = useRef([]);

  activeCameraIdsRef.current = new Set(
    activeCameraIds
      .map((cameraId) => (cameraId == null ? "" : String(cameraId).trim()))
      .filter(Boolean)
  );

  useEffect(() => {
    const socket = new WebSocket(serverUrl, "webrtc-protocol");
    socketRef.current = socket;
    setStatus("connecting");
    setDetail(`Opening ${serverUrl}`);

    const send = (payload) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      if (typeof payload?.type !== "string" || !payload.type) return;
      const raw = JSON.stringify(payload);
      socket.send(raw);
    };

    const sendCameraCommand = (cameraId, enabled) => {
      send({
        type: enabled ? "enable" : "disable",
        camera_id: String(cameraId),
      });
    };

    const clearCameraStream = (cameraId) => {
      setStreams((current) => {
        if (!current[cameraId]) return current;
        const next = { ...current };
        delete next[cameraId];
        return next;
      });
    };

    const ensurePeerConnection = (cameraId) => {
      if (peerConnectionsRef.current[cameraId]) {
        return peerConnectionsRef.current[cameraId];
      }

      const peerConnection = new RTCPeerConnection();
      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        setStreams((current) => ({ ...current, [cameraId]: stream }));
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) return;
        const sdpMLineIndex = event.candidate.sdpMLineIndex ?? 0;
        send({
          type: "ice",
          id: String(cameraId),
          candidate: event.candidate.candidate,
          sdpMLineIndex,
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(peerConnection.connectionState)) {
          clearCameraStream(cameraId);
        }
      };

      peerConnectionsRef.current[cameraId] = peerConnection;
      return peerConnection;
    };

    const subscribeToCamera = (cameraId) => {
      const normalizedCameraId = String(cameraId);
      if (subscribedCameraIdsRef.current.has(normalizedCameraId)) return;
      subscribedCameraIdsRef.current.add(normalizedCameraId);
      ensurePeerConnection(cameraId);
      sendCameraCommand(cameraId, true);
      setDebug((current) => ({
        ...current,
        subscriptionsSent: current.subscriptionsSent + 1,
        lastSent: `enable ${cameraId}`,
      }));
    };

    const unsubscribeFromCamera = (cameraId) => {
      const normalizedCameraId = String(cameraId);
      if (!subscribedCameraIdsRef.current.has(normalizedCameraId)) return;
      subscribedCameraIdsRef.current.delete(normalizedCameraId);
      sendCameraCommand(cameraId, false);
      peerConnectionsRef.current[cameraId]?.close();
      delete peerConnectionsRef.current[cameraId];
      clearCameraStream(cameraId);
      setDebug((current) => ({
        ...current,
        unsubscriptionsSent: current.unsubscriptionsSent + 1,
        lastSent: `disable ${cameraId}`,
      }));
    };

    const syncSubscriptions = () => {
      if (socket.readyState !== WebSocket.OPEN) return;

      subscribeTimersRef.current.forEach((timer) => clearTimeout(timer));
      subscribeTimersRef.current = [];

      Array.from(activeCameraIdsRef.current).forEach((cameraId, index) => {
        if (subscribedCameraIdsRef.current.has(String(cameraId))) return;
        const timer = window.setTimeout(() => {
          subscribeToCamera(cameraId);
        }, index * 700);
        subscribeTimersRef.current.push(timer);
      });

      Array.from(subscribedCameraIdsRef.current).forEach((cameraId) => {
        if (!activeCameraIdsRef.current.has(String(cameraId))) {
          unsubscribeFromCamera(cameraId);
        }
      });
    };

    const handleOffer = async (message) => {
      const cameraId = getCameraId(message);
      const offer = getOfferDescription(message);
      if (cameraId == null || !offer) return;

      const peerConnection = ensurePeerConnection(cameraId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      const localDescription = peerConnection.localDescription;
      const sdp = localDescription?.sdp || answer?.sdp;
      if (!sdp) return;

      send({
        type: "answer",
        id: String(cameraId),
        sdp,
      });
      setDebug((current) => ({
        ...current,
        answersSent: current.answersSent + 1,
        lastSent: `answer ${cameraId}`,
      }));
    };

    const handleIce = async (message) => {
      const cameraId = getCameraId(message);
      const candidate = getIceCandidate(message);
      if (cameraId == null || !candidate) return;

      const peerConnection = peerConnectionsRef.current[cameraId];
      if (!peerConnection) return;

      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.onopen = () => {
      setStatus("connected");
      setDetail(`Connected to ${serverUrl}`);
      syncSubscriptions();
    };

    socket.onclose = (event) => {
      setStatus("disconnected");
      setDetail(`Closed code ${event.code}${event.reason ? `: ${event.reason}` : ""}`);
    };

    socket.onerror = () => {
      setStatus("error");
      setDetail(`WebSocket error for ${serverUrl}`);
    };

    socket.onmessage = async (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (_) {
        setLastMessage("non-json");
        setDetail("Received non-JSON WebSocket message");
        return;
      }

      const messageType = typeof message?.type === "string" ? message.type : "message";

      try {
        if (messageType === "state") {
          const ids = extractCameraIds(message);
          setCameraIds(ids);
          setLastMessage("state");
          syncSubscriptions();
          return;
        }

        if (messageType === "offer") {
          setDebug((current) => ({ ...current, offersReceived: current.offersReceived + 1 }));
          setLastMessage("offer");
          await handleOffer(message);
          return;
        }

        if (messageType === "ice") {
          await handleIce(message);
        }
      } catch (error) {
        setStatus("error");
        setDetail(error?.message || "WebRTC signaling error");
      }
    };

    return () => {
      subscribedCameraIdsRef.current.forEach((cameraId) => {
        sendCameraCommand(cameraId, false);
      });
      subscribeTimersRef.current.forEach((timer) => clearTimeout(timer));
      subscribeTimersRef.current = [];
      socket.close();
      Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
        peerConnection.close();
      });
      peerConnectionsRef.current = {};
      subscribedCameraIdsRef.current = new Set();
      setStreams({});
      setCameraIds([]);
      setDebug({
        subscriptionsSent: 0,
        unsubscriptionsSent: 0,
        offersReceived: 0,
        answersSent: 0,
        iceIn: 0,
        iceOut: 0,
        lastSent: "",
        lastSentRaw: "",
        lastReceivedRaw: "",
      });
    };
  }, [serverUrl, reconnectToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    subscribeTimersRef.current.forEach((timer) => clearTimeout(timer));
    subscribeTimersRef.current = [];

    Array.from(activeCameraIdsRef.current).forEach((cameraId, index) => {
      if (!subscribedCameraIdsRef.current.has(cameraId)) {
        const timer = window.setTimeout(() => {
          const raw = JSON.stringify({ type: "enable", camera_id: String(cameraId) });
          socket.send(raw);
          subscribedCameraIdsRef.current.add(cameraId);
          setDebug((current) => ({
            ...current,
            subscriptionsSent: current.subscriptionsSent + 1,
            lastSent: `enable ${cameraId}`,
          }));
        }, index * 700);
        subscribeTimersRef.current.push(timer);
      }
    });

    Array.from(subscribedCameraIdsRef.current).forEach((cameraId) => {
      if (activeCameraIdsRef.current.has(String(cameraId))) return;

      const raw = JSON.stringify({ type: "disable", camera_id: String(cameraId) });
      socket.send(raw);
      subscribedCameraIdsRef.current.delete(String(cameraId));
      peerConnectionsRef.current[cameraId]?.close();
      delete peerConnectionsRef.current[cameraId];
      setStreams((current) => {
        if (!current[cameraId]) return current;
        const next = { ...current };
        delete next[cameraId];
        return next;
      });
      setDebug((current) => ({
        ...current,
        unsubscriptionsSent: current.unsubscriptionsSent + 1,
        lastSent: `disable ${cameraId}`,
      }));
    });
  }, [activeCameraIds]);

  return { cameraIds, streams, status, detail, lastMessage, stats: {}, debug };
}
