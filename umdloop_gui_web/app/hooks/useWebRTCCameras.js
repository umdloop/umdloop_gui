"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWhepBaseUrl } from "../config/environment";

const RECONNECT_DELAY_MS = 2000;
const LEGACY_CAMERA_ROLE_MAP = {
  wheel_tl_a: "wheel_tl",
  wheel_tl_b: "wheel_tl",
  wheel_tr_a: "wheel_tr",
  wheel_tr_b: "wheel_tr",
  wheel_bl_a: "wheel_bl",
  wheel_bl_b: "wheel_bl",
  wheel_br_a: "wheel_br",
  wheel_br_b: "wheel_br",
};
const DEFAULT_CAMERA_FPS = 10;
const DEFAULT_CAMERA_QUALITY = "low";

function getCameraId(message) {
  return message?.id ?? message?.cam_id ?? message?.cameraId ?? message?.camera_id ?? message?.camera;
}

function normalizeCamera(camera, index) {
  const rawId = getCameraId(camera) ?? camera;
  if (rawId == null) return null;

  const id = String(rawId).trim();
  if (!id) return null;

  const cameraConfig = typeof camera === "object" && camera != null ? camera : {};
  const config = cameraConfig.config ?? {};
  const rawRole = cameraConfig.role ?? config.role ?? null;
  const role = rawRole ? LEGACY_CAMERA_ROLE_MAP[rawRole] ?? rawRole : null;

  return {
    ...cameraConfig,
    ...config,
    id,
    name: cameraConfig.name ?? config.name ?? `Camera ${id}`,
    role,
    device: cameraConfig.device ?? cameraConfig.path ?? `camera ${index + 1}`,
    capabilities: cameraConfig.capabilities ?? [],
    fps: cameraConfig.fps ?? config.fps ?? DEFAULT_CAMERA_FPS,
    quality: cameraConfig.quality ?? config.quality ?? DEFAULT_CAMERA_QUALITY,
    enabled: Boolean(cameraConfig.enabled ?? config.enabled),
    synthetic: Boolean(cameraConfig.synthetic),
  };
}

function normalizeCameras(message) {
  const source =
    message?.cameras ??
    message?.camera_ids ??
    message?.cameraIds ??
    message?.devices ??
    message?.available_cameras ??
    [];

  if (!Array.isArray(source)) return [];

  const normalized = source
    .map((camera, index) => normalizeCamera(camera, index))
    .filter(Boolean);

  return normalized;
}

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

  const updateCamera = useCallback((id, changes) => {
    setCameras((prev) => prev.map((camera) => (
      camera.id === String(id) ? { ...camera, ...changes } : camera
    )));
  }, []);

  const whepBase = getWhepBaseUrl();

  const stopWhep = useCallback((id) => {
    const pc = pcsRef.current.get(id);
    if (pc) {
      pc.close();
      pcsRef.current.delete(id);
    }
    setStreams((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const startWhep = useCallback(async (id) => {
    if (pcsRef.current.has(id)) return;

    const pc = new RTCPeerConnection({ iceServers: [] });
    pcsRef.current.set(id, pc);

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.ontrack = (event) => {
      if (!mountedRef.current) return;
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setStreams((prev) => ({ ...prev, [id]: stream }));
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Backend's RTSP publish handshake can lag the WS state broadcast by
      // a few hundred ms; retry on 404 while MediaMTX has no publisher.
      let res;
      for (let attempt = 0; attempt < 10; attempt++) {
        if (!pcsRef.current.has(id)) return;
        res = await fetch(`${whepBase}/${id}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
        if (res.ok || res.status !== 404) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!res?.ok) throw new Error(`WHEP ${res?.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    } catch (err) {
      console.error(`WHEP start failed for ${id}:`, err);
      stopWhep(id);
    }
  }, [whepBase, stopWhep]);

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
        case "camera_state":
        case "camera_list":
          setCameras(normalizeCameras(msg));
          break;
        case "missions_state":
          setMissions(msg.missions ?? []);
          setActiveMission(msg.active_mission ?? null);
          break;
        case "stats": {
          const id = String(getCameraId(msg) ?? "");
          if (id) {
            setStats((prev) => ({ ...prev, [id]: { fps: msg.fps, bitrate: msg.bitrate } }));
          }
          break;
        }
      }
    };
  }, [url, closeAllPeerConnections]);

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

  useEffect(() => {
    const enabledIds = new Set(cameras.filter((c) => c.enabled).map((c) => c.id));
    for (const id of enabledIds) {
      if (!pcsRef.current.has(id)) startWhep(id);
    }
    for (const id of [...pcsRef.current.keys()]) {
      if (!enabledIds.has(id)) stopWhep(id);
    }
  }, [cameras, startWhep, stopWhep]);

  const enableCamera = useCallback((id) => {
    updateCamera(id, { enabled: true });
    send({ type: "enable", camera_id: id });
  }, [send, updateCamera]);
  const disableCamera = useCallback((id) => {
    updateCamera(id, { enabled: false });
    send({ type: "disable", camera_id: id });
  }, [send, updateCamera]);
  const renameCamera = useCallback((id, name) => {
    updateCamera(id, { name });
    send({ type: "rename", camera_id: id, name });
  }, [send, updateCamera]);
  const setRole = useCallback((id, role) => {
    const normalizedRole = role ?? "";
    updateCamera(id, { role: normalizedRole });
    send({ type: "set_config", camera_id: id, config: { role: normalizedRole } });
  }, [send, updateCamera]);
  const setConfig = useCallback((id, config) => {
    updateCamera(id, config);
    send({ type: "set_config", camera_id: id, config });
  }, [send, updateCamera]);
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
