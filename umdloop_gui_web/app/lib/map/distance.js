/**
 * Great-circle distance computation using the Haversine formula.
 *
 * Used to compute distances between adjacent waypoints on the navigator map.
 */

const EARTH_RADIUS_M = 6371000;

/**
 * Converts degrees to radians.
 * @param {number} deg - Angle in degrees.
 * @returns {number} Angle in radians.
 */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Computes the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in degrees.
 * @param {number} lon1 - Longitude of point 1 in degrees.
 * @param {number} lat2 - Latitude of point 2 in degrees.
 * @param {number} lon2 - Longitude of point 2 in degrees.
 * @returns {number} Distance in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Computes distances between each adjacent pair of waypoints in ordinal order.
 *
 * @param {Array<{latitude: number, longitude: number}>} waypoints - Ordered waypoint list.
 * @returns {Array<number>} Array of distances in meters between adjacent pairs.
 *   Length is `waypoints.length - 1`. Returns empty array if fewer than 2 waypoints.
 */
export function computeAdjacentDistances(waypoints) {
  if (waypoints.length < 2) {
    return [];
  }

  const distances = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i];
    const wp2 = waypoints[i + 1];
    distances.push(haversineDistance(wp1.latitude, wp1.longitude, wp2.latitude, wp2.longitude));
  }
  return distances;
}
