/**
 * Drone distance and flight tracker.
 *
 * Accumulates drone traveled distance from GLOBAL_POSITION_INT updates,
 * records crossing times at defined increments (100m, 200m, 300m, 400m, 500m),
 * computes battery drain rate over a 60-second rolling window, and projects
 * remaining flight/non-flight time based on armed state.
 */

/** Distance increments to track for the drone (in meters). */
export const DRONE_INCREMENTS = [100, 200, 300, 400, 500];

/** Rolling window duration for battery drain rate computation (in ms). */
export const DRAIN_WINDOW_MS = 60000;

/**
 * Creates a new drone tracker state.
 * @param {number} [startTime=0] - Mission start time in ms.
 * @returns {object} Drone tracker state.
 */
export function createDroneTracker(startTime = 0) {
  const crossings = {};
  for (const inc of DRONE_INCREMENTS) {
    crossings[inc] = {
      lastCrossingTime: startTime,
      intervals: [],
    };
  }

  return {
    totalDistance: 0,
    startTime,
    crossings,
    batteryReadings: [], // Array of { timestamp, pct }
  };
}

/**
 * Updates the drone tracker with a new displacement from GLOBAL_POSITION_INT.
 * Returns a new tracker state (immutable).
 *
 * @param {object} tracker - Current drone tracker state.
 * @param {number} displacement - Non-negative displacement in meters.
 * @param {number} timestamp - Current time in ms.
 * @returns {object} Updated drone tracker state.
 */
export function addDroneDisplacement(tracker, displacement, timestamp) {
  if (displacement < 0) {
    return tracker;
  }

  const prevDistance = tracker.totalDistance;
  const newDistance = prevDistance + displacement;

  const newCrossings = {};
  for (const inc of DRONE_INCREMENTS) {
    const prev = tracker.crossings[inc];
    const prevMultiple = Math.floor(prevDistance / inc);
    const newMultiple = Math.floor(newDistance / inc);

    if (newMultiple > prevMultiple) {
      const elapsed = timestamp - prev.lastCrossingTime;
      const crossingCount = newMultiple - prevMultiple;
      const intervalPerCrossing = elapsed / crossingCount;
      const newIntervals = [...prev.intervals];
      for (let i = 0; i < crossingCount; i++) {
        newIntervals.push(intervalPerCrossing);
      }
      newCrossings[inc] = {
        lastCrossingTime: timestamp,
        intervals: newIntervals,
      };
    } else {
      newCrossings[inc] = prev;
    }
  }

  return {
    ...tracker,
    totalDistance: newDistance,
    crossings: newCrossings,
  };
}

/**
 * Records a battery reading and prunes readings older than the rolling window.
 * Returns a new tracker state (immutable).
 *
 * @param {object} tracker - Current drone tracker state.
 * @param {number} batteryPct - Battery percentage (0-100).
 * @param {number} timestamp - Current time in ms.
 * @returns {object} Updated drone tracker state.
 */
export function addBatteryReading(tracker, batteryPct, timestamp) {
  const windowStart = timestamp - DRAIN_WINDOW_MS;
  const newReadings = [
    ...tracker.batteryReadings.filter((r) => r.timestamp >= windowStart),
    { timestamp, pct: batteryPct },
  ];

  return {
    ...tracker,
    batteryReadings: newReadings,
  };
}

/**
 * Computes the battery drain rate in percent per minute over the 60-second
 * rolling window.
 *
 * Formula: (first_pct - last_pct) / elapsed_minutes
 *
 * @param {object} tracker - Drone tracker state.
 * @returns {number|null} Drain rate in %/min, or null if insufficient data.
 */
export function getDrainRate(tracker) {
  const readings = tracker.batteryReadings;
  if (readings.length < 2) {
    return null;
  }

  const first = readings[0];
  const last = readings[readings.length - 1];
  const elapsedMs = last.timestamp - first.timestamp;

  if (elapsedMs <= 0) {
    return null;
  }

  const elapsedMinutes = elapsedMs / 60000;
  return (first.pct - last.pct) / elapsedMinutes;
}

/**
 * Projects remaining flight time when the drone is armed.
 *
 * Formula: current_battery_pct / drain_rate_in_flight_pct_per_minute
 *
 * @param {number} currentPct - Current battery percentage.
 * @param {number} drainRatePctPerMin - Drain rate in %/min while in flight.
 * @returns {number|null} Projected remaining flight time in minutes, or null if drain rate is non-positive.
 */
export function projectFlightTime(currentPct, drainRatePctPerMin) {
  if (drainRatePctPerMin <= 0) {
    return null;
  }
  return currentPct / drainRatePctPerMin;
}

/**
 * Projects remaining non-flight (idle/relay) time when the drone is disarmed.
 *
 * Formula: current_battery_pct / drain_rate_idle_pct_per_minute
 *
 * @param {number} currentPct - Current battery percentage.
 * @param {number} drainRateIdlePctPerMin - Drain rate in %/min while idle.
 * @returns {number|null} Projected remaining idle time in minutes, or null if drain rate is non-positive.
 */
export function projectIdleTime(currentPct, drainRateIdlePctPerMin) {
  if (drainRateIdlePctPerMin <= 0) {
    return null;
  }
  return currentPct / drainRateIdlePctPerMin;
}

/**
 * Computes the rolling average time (in minutes) for a given drone increment.
 *
 * @param {object} tracker - Drone tracker state.
 * @param {number} increment - One of DRONE_INCREMENTS (100, 200, 300, 400, 500).
 * @returns {number|null} Average minutes per increment, or null if no data.
 */
export function getDroneAverageMinutes(tracker, increment) {
  const crossing = tracker.crossings[increment];
  if (!crossing || crossing.intervals.length === 0) {
    return null;
  }
  const sum = crossing.intervals.reduce((a, b) => a + b, 0);
  return sum / crossing.intervals.length / 60000; // ms to minutes
}
