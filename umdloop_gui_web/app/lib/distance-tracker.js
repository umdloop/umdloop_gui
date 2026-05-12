/**
 * Distance tracker for rover odometry.
 *
 * Accumulates rover traveled distance from odom updates, records crossing times
 * at defined increments (1m, 10m, 50m, 100m), computes rolling averages,
 * and projects traversal time to the next waypoint.
 */

/** Distance increments to track (in meters). */
export const INCREMENTS = [1, 10, 50, 100];

/**
 * Creates a new distance tracker state.
 * @param {number} [startTime=0] - Mission start time in ms.
 * @returns {object} Tracker state.
 */
export function createDistanceTracker(startTime = 0) {
  const crossings = {};
  for (const inc of INCREMENTS) {
    crossings[inc] = {
      lastCrossingTime: startTime,
      intervals: [],
    };
  }

  return {
    totalDistance: 0,
    startTime,
    crossings,
  };
}

/**
 * Updates the tracker with a new displacement.
 * Returns a new tracker state (immutable).
 *
 * @param {object} tracker - Current tracker state.
 * @param {number} displacement - Non-negative displacement in meters from this odom update.
 * @param {number} timestamp - Current time in ms.
 * @returns {object} Updated tracker state.
 */
export function addDisplacement(tracker, displacement, timestamp) {
  if (displacement < 0) {
    return tracker;
  }

  const prevDistance = tracker.totalDistance;
  const newDistance = prevDistance + displacement;

  const newCrossings = {};
  for (const inc of INCREMENTS) {
    const prev = tracker.crossings[inc];
    const prevMultiple = Math.floor(prevDistance / inc);
    const newMultiple = Math.floor(newDistance / inc);

    if (newMultiple > prevMultiple) {
      // One or more crossings occurred
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
    totalDistance: newDistance,
    startTime: tracker.startTime,
    crossings: newCrossings,
  };
}

/**
 * Computes the rolling average time (in minutes) for a given increment.
 *
 * @param {object} tracker - Tracker state.
 * @param {number} increment - One of INCREMENTS (1, 10, 50, 100).
 * @returns {number|null} Average minutes per increment, or null if no data.
 */
export function getAverageMinutes(tracker, increment) {
  const crossing = tracker.crossings[increment];
  if (!crossing || crossing.intervals.length === 0) {
    return null;
  }
  const sum = crossing.intervals.reduce((a, b) => a + b, 0);
  return sum / crossing.intervals.length / 60000; // ms to minutes
}

/**
 * Projects traversal time to the next waypoint.
 *
 * Formula: distance_to_next_waypoint_m / 100 * average_minutes_per_100m
 *
 * @param {number} distanceToNextM - Distance to next waypoint in meters.
 * @param {number} avgMinutesPer100m - Average minutes per 100m increment.
 * @returns {number} Projected traversal time in minutes.
 */
export function projectTraversalTime(distanceToNextM, avgMinutesPer100m) {
  return (distanceToNextM / 100) * avgMinutesPer100m;
}
