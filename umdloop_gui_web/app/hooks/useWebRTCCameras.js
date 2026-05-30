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
  const watchdogsRef = useRef(new Map()); // id -> setTimeout handle for "no track arrived" recovery
  const enabledIdsRef = useRef(new Set()); // last server-reported enabled set; consulted by retry timers
  const streamsRef = useRef({});           // mirror of streams so retry timers can check without re-rendering
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const closeAllPeerConnections = useCallback(() => {
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    for (const handle of watchdogsRef.current.values()) clearTimeout(handle);
    watchdogsRef.current.clear();
    streamsRef.current = {};
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
    const handle = watchdogsRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      watchdogsRef.current.delete(id);
    }
    const pc = pcsRef.current.get(id);
    if (pc) {
      pc.close();
      pcsRef.current.delete(id);
    }
    if (id in streamsRef.current) {
      const { [id]: _, ...rest } = streamsRef.current;
      streamsRef.current = rest;
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
      const handle = watchdogsRef.current.get(id);
      if (handle) {
        clearTimeout(handle);
        watchdogsRef.current.delete(id);
      }
      streamsRef.current = { ...streamsRef.current, [id]: stream };
      setStreams((prev) => ({ ...prev, [id]: stream }));
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

<<<<<<< HEAD
      // Backend's RTSP publish handshake can lag the WS state broadcast by
      // a few hundred ms — and with several cameras starting at once, MediaMTX
      // can take much longer than the old 3s budget to register the publisher.
      // Keep retrying on 404 with backoff as long as this PC is still current.
      let res;
      let delayMs = 300;
      while (pcsRef.current.get(id) === pc) {
=======
      // For ROS-topic cameras the subprocess (Python + GStreamer + rosbridge)
      // can take 5–10 s to start publishing RTSP. Retry for up to 30 s.
      let res;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (!pcsRef.current.has(id)) return;
>>>>>>> cfb614b (Object Detection updates)
        res = await fetch(`${whepBase}/${id}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
        if (res.ok || res.status !== 404) break;
<<<<<<< HEAD
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.5, 2000);
=======
        await new Promise((r) => setTimeout(r, 500));
>>>>>>> cfb614b (Object Detection updates)
      }
      if (pcsRef.current.get(id) !== pc) return; // stopped or replaced while waiting
      if (!res?.ok) throw new Error(`WHEP ${res?.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });

      // Watchdog: if no track arrives within 8s, tear down and try again.
      const watchdog = setTimeout(() => {
        if (!mountedRef.current) return;
        if (pcsRef.current.get(id) !== pc) return;
        if (id in streamsRef.current) return;
        console.warn(`WHEP watchdog: no track for ${id}, restarting`);
        stopWhep(id);
        if (enabledIdsRef.current.has(id)) startWhep(id);
      }, 8000);
      watchdogsRef.current.set(id, watchdog);
    } catch (err) {
      console.error(`WHEP start failed for ${id}:`, err);
      // Don't give up — backend is source of truth on enable state.
      if (pcsRef.current.get(id) === pc) {
        stopWhep(id);
        setTimeout(() => {
          if (!mountedRef.current) return;
          if (!pcsRef.current.has(id) && enabledIdsRef.current.has(id)) startWhep(id);
        }, 1500);
      }
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
    enabledIdsRef.current = enabledIds;
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
