/**
 * Drone front-end modules.
 *
 * Re-exports drone telemetry tracking and battery utilities:
 *   import { createDroneTracker, addDroneDisplacement, getDrainRate } from "@/app/drone";
 */

export {
  DRONE_INCREMENTS,
  DRAIN_WINDOW_MS,
  createDroneTracker,
  addDroneDisplacement,
  addBatteryReading,
  getDrainRate,
  projectFlightTime,
  projectIdleTime,
  getDroneAverageMinutes,
} from "./drone-tracker";

export {
  TATTU_HV_6S_22000,
  estimatePackVoltageFromSoc,
  buildBatteryHealthSnapshot,
} from "./battery";
