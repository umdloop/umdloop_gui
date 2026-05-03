"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_DELAY_MS = 2000;

export default function useWebRTCCameras(url) {
  const [connected, setConnected] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [streams, setStreams] = useState({});
  const [stats, setStats] = useState({});
  const [missions, setMissions] = useState([]);
  const [activeMission, setActiveMission] = useState(null);

  const wsRef = useRef(null);
  const pcsRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const closeAllPeerConnections = useCallback(() => {
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    setStreams({});
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleOffer = useCallback(async ({ id, sdp }) => {
    pcsRef.current.get(id)?.close();

    const pc = new RTCPeerConnection({ iceServers: [] });
    pcsRef.current.set(id, pc);

    pc.ontrack = (event) => {
      if (!mountedRef.current) return;
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setStreams((prev) => ({ ...prev, [id]: stream }));
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      send({
        type: "ice",
        id,
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      });
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: "answer", id, sdp: answer.sdp });
  }, [send]);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;

    const ws = new WebSocket(url, "webrtc-protocol");
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      closeAllPeerConnections();
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "state":
          setCameras(msg.cameras ?? []);
          break;
        case "missions_state":
          setMissions(msg.missions ?? []);
          setActiveMission(msg.active_mission ?? null);
          break;
        case "offer":
          await handleOffer(msg).catch((err) => console.error("WebRTC offer handling failed:", err));
          break;
        case "ice": {
          const pc = pcsRef.current.get(msg.id);
          if (pc) {
            pc.addIceCandidate({ candidate: msg.candidate, sdpMLineIndex: msg.sdpMLineIndex }).catch(() => {});
          }
          break;
        }
        case "stats":
          setStats((prev) => ({ ...prev, [msg.camera_id]: { fps: msg.fps, bitrate: msg.bitrate } }));
          break;
      }
    };
  }, [url, closeAllPeerConnections, handleOffer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      closeAllPeerConnections();
    };
  }, [connect, closeAllPeerConnections]);

  const enableCamera  = useCallback((id) => send({ type: "enable",  camera_id: id }), [send]);
  const disableCamera = useCallback((id) => send({ type: "disable", camera_id: id }), [send]);
  const renameCamera  = useCallback((id, name) => send({ type: "rename", camera_id: id, name }), [send]);
  const setRole       = useCallback((id, role) => send({ type: "set_config", camera_id: id, config: { role } }), [send]);
  const setConfig     = useCallback((id, config) => send({ type: "set_config", camera_id: id, config }), [send]);
  const saveMission   = useCallback((name, id) => send({ type: "save_mission", name, ...(id != null ? { id } : {}) }), [send]);
  const loadMission   = useCallback((id) => send({ type: "load_mission", id }), [send]);
  const deleteMission = useCallback((id) => send({ type: "delete_mission", id }), [send]);

  return {
    connected,
    cameras,
    stats,
    streams,
    missions,
    activeMission,
    enableCamera,
    disableCamera,
    renameCamera,
    setRole,
    setConfig,
    saveMission,
    loadMission,
    deleteMission,
  };
}
