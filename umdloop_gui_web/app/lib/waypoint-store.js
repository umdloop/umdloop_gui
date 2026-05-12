/**
 * Waypoint list state management for the UMD Loop navigator.
 *
 * Provides coordinate validation, ordered waypoint storage, and list operations.
 * Waypoints are stored in ordinal order (1-based index).
 */

/**
 * Validates that a latitude value is within [-90, 90].
 * @param {number} lat - Latitude to validate.
 * @returns {boolean} True if valid.
 */
export function isValidLatitude(lat) {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validates that a longitude value is within [-180, 180].
 * @param {number} lon - Longitude to validate.
 * @returns {boolean} True if valid.
 */
export function isValidLongitude(lon) {
  return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/**
 * Validates a coordinate pair.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {boolean} True if both coordinates are valid.
 */
export function isValidCoordinate(lat, lon) {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Creates a new waypoint store (immutable pattern).
 * @returns {{ waypoints: Array<{index: number, latitude: number, longitude: number, label?: string}> }}
 */
export function createWaypointStore() {
  return { waypoints: [] };
}

/**
 * Adds a waypoint to the store. Returns a new store with the waypoint appended.
 * Returns null if coordinates are invalid (store unchanged).
 *
 * @param {{ waypoints: Array }} store - Current waypoint store.
 * @param {number} latitude - Latitude in [-90, 90].
 * @param {number} longitude - Longitude in [-180, 180].
 * @param {string} [label] - Optional label.
 * @returns {{ waypoints: Array }|null} New store with waypoint added, or null if invalid.
 */
export function addWaypoint(store, latitude, longitude, label) {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  const newIndex = store.waypoints.length + 1;
  const waypoint = { index: newIndex, latitude, longitude };
  if (label !== undefined) {
    waypoint.label = label;
  }

  return {
    waypoints: [...store.waypoints, waypoint],
  };
}

/**
 * Returns waypoints in ordinal order (1 to N).
 * @param {{ waypoints: Array }} store - Waypoint store.
 * @returns {Array<{index: number, latitude: number, longitude: number, label?: string}>}
 */
export function getWaypointsInOrder(store) {
  return [...store.waypoints].sort((a, b) => a.index - b.index);
}
