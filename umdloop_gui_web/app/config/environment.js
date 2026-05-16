/**
 * Client-side config for UMD Loop GUI.
 * Base station has internet; rover does not. GUI runs on base and connects to rover over radio.
 *
 * Set in .env.local or at build time:
 *   NEXT_PUBLIC_ROSBRIDGE_WS_URL - WebSocket URL for Rosbridge on the rover (default: ws://localhost:9090).
 *                                  In the field, set to e.g. ws://192.168.1.100:9090 (rover's IP on radio network).
 *   NEXT_PUBLIC_GUI_API_URL      - Base URL for the local Flask API (default: http://127.0.0.1:5000).
 *   NEXT_PUBLIC_USE_LOCAL_TILES  - Set to "true" to use offline tiles from public/tiles/ instead of MapTiler CDN.
 *                                  Run `python3 scripts/download_tiles.py` first to populate the tiles.
 */

export function getRosbridgeUrl() {
  if (typeof window !== "undefined") {
    return window.__ROSBRIDGE_WS_URL__ ?? "ws://localhost:9090";
  }
  return process.env.NEXT_PUBLIC_ROSBRIDGE_WS_URL || "ws://localhost:9090";
}

export function useLocalTiles() {
  return process.env.NEXT_PUBLIC_USE_LOCAL_TILES === "true";
}

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return window.__GUI_API_URL__ ?? "http://127.0.0.1:5000";
  }
  return process.env.NEXT_PUBLIC_GUI_API_URL || "http://127.0.0.1:5000";
}

// Control-channel WebSocket (port 8081) for camera enable/disable/state and
// mission control. Media signaling no longer flows through here — see
// getWhepBaseUrl() for the WHEP media endpoint.
export function getWebRTCUrl() {
  const envUrl = process.env.NEXT_PUBLIC_WEBRTC_WS_URL;

  if (typeof window !== "undefined") {
    if (window.__WEBRTC_WS_URL__) return window.__WEBRTC_WS_URL__;
    if (envUrl) return envUrl;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8081`;
  }

  return envUrl || "ws://localhost:8081";
}

export function getWhepBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_WHEP_BASE_URL;

  if (typeof window !== "undefined") {
    if (window.__WHEP_BASE_URL__) return window.__WHEP_BASE_URL__;
    if (envUrl) return envUrl;

    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:8889`;
  }

  return envUrl || "http://localhost:8889";
}
