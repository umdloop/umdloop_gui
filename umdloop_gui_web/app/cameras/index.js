/**
 * Camera front-end components and hooks.
 *
 * Re-exports all camera-related modules:
 *   import { CameraFeed, WebRTCProvider, useWebRTC } from "@/app/cameras";
 */

export { default as CameraFeed } from "./CameraFeed";
export { WebRTCProvider, useWebRTC } from "./WebRTCContext";
export { default as useWebRTCCameras } from "./useWebRTCCameras";
