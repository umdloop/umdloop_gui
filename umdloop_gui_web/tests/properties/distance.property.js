import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { haversineDistance, computeAdjacentDistances } from '../../app/lib/map/distance.js';

/**
 * Reference Haversine implementation for oracle testing.
 */
function referenceHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const validLatArb = fc.double({ min: -90, max: 90, noNaN: true });
const validLonArb = fc.double({ min: -180, max: 180, noNaN: true });

const waypointArb = fc.record({
  latitude: validLatArb,
  longitude: validLonArb,
});

/**
 * **Feature: gui-reorganization, Property 8: Great-circle distance computation**
 * **Validates: Requirements 15.3**
 *
 * For any ordered list of two or more Waypoints, the computed distance between
 * each adjacent pair SHALL equal the haversine distance between those coordinates
 * (within floating-point tolerance of 0.01 m).
 */
describe('Property 8: Great-circle distance computation', () => {
  it('computeAdjacentDistances matches haversine for each adjacent pair', () => {
    fc.assert(
      fc.property(
        fc.array(waypointArb, { minLength: 2, maxLength: 10 }),
        (waypoints) => {
          const distances = computeAdjacentDistances(waypoints);
          expect(distances.length).toBe(waypoints.length - 1);

          for (let i = 0; i < distances.length; i++) {
            const expected = referenceHaversine(
              waypoints[i].latitude,
              waypoints[i].longitude,
              waypoints[i + 1].latitude,
              waypoints[i + 1].longitude
            );
            expect(Math.abs(distances[i] - expected)).toBeLessThanOrEqual(0.01);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('distance is always non-negative', () => {
    fc.assert(
      fc.property(validLatArb, validLonArb, validLatArb, validLonArb, (lat1, lon1, lat2, lon2) => {
        const d = haversineDistance(lat1, lon1, lat2, lon2);
        expect(d).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('distance from a point to itself is zero', () => {
    fc.assert(
      fc.property(validLatArb, validLonArb, (lat, lon) => {
        const d = haversineDistance(lat, lon, lat, lon);
        expect(d).toBeCloseTo(0, 5);
      }),
      { numRuns: 100 }
    );
  });

  it('distance is symmetric', () => {
    fc.assert(
      fc.property(validLatArb, validLonArb, validLatArb, validLonArb, (lat1, lon1, lat2, lon2) => {
        const d1 = haversineDistance(lat1, lon1, lat2, lon2);
        const d2 = haversineDistance(lat2, lon2, lat1, lon1);
        expect(Math.abs(d1 - d2)).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 }
    );
  });
});

import {
  createDistanceTracker,
  addDisplacement,
  projectTraversalTime,
} from '../../app/lib/distance-tracker.js';

/**
 * **Feature: gui-reorganization, Property 9: Traversal time projection formula**
 * **Validates: Requirements 15.4**
 *
 * For any positive average_minutes_per_100m and positive distance_to_next_waypoint_m,
 * the projected traversal time SHALL equal distance_to_next_waypoint_m / 100 * average_minutes_per_100m.
 */
describe('Property 9: Traversal time projection formula', () => {
  const posDoubleArb = fc.double({ min: 0.001, max: 100000, noNaN: true, noDefaultInfinity: true });

  it('projectTraversalTime equals distance/100 * avgMinPer100m', () => {
    fc.assert(
      fc.property(posDoubleArb, posDoubleArb, (distanceM, avgMin) => {
        const result = projectTraversalTime(distanceM, avgMin);
        const expected = (distanceM / 100) * avgMin;
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(1e-9);
      }),
      { numRuns: 100 }
    );
  });

  it('projected time scales linearly with distance', () => {
    fc.assert(
      fc.property(posDoubleArb, posDoubleArb, (distanceM, avgMin) => {
        const t1 = projectTraversalTime(distanceM, avgMin);
        const t2 = projectTraversalTime(distanceM * 2, avgMin);
        expect(Math.abs(t2 - t1 * 2)).toBeLessThanOrEqual(1e-6);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: gui-reorganization, Property 10: Distance accumulation monotonicity**
 * **Validates: Requirements 15.1**
 *
 * For any sequence of odometry updates with non-negative displacement,
 * the accumulated distance SHALL be monotonically non-decreasing.
 */
describe('Property 10: Distance accumulation monotonicity', () => {
  const displacementArb = fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true });

  it('accumulated distance is monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.array(displacementArb, { minLength: 1, maxLength: 50 }),
        (displacements) => {
          let tracker = createDistanceTracker(0);
          let prevDistance = 0;
          let time = 1000;

          for (const d of displacements) {
            tracker = addDisplacement(tracker, d, time);
            expect(tracker.totalDistance).toBeGreaterThanOrEqual(prevDistance);
            prevDistance = tracker.totalDistance;
            time += 1000;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total distance equals sum of all displacements', () => {
    fc.assert(
      fc.property(
        fc.array(displacementArb, { minLength: 1, maxLength: 50 }),
        (displacements) => {
          let tracker = createDistanceTracker(0);
          let time = 1000;

          for (const d of displacements) {
            tracker = addDisplacement(tracker, d, time);
            time += 1000;
          }

          const expectedTotal = displacements.reduce((a, b) => a + b, 0);
          expect(Math.abs(tracker.totalDistance - expectedTotal)).toBeLessThanOrEqual(1e-9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('negative displacements are ignored', () => {
    fc.assert(
      fc.property(displacementArb, (d) => {
        let tracker = createDistanceTracker(0);
        tracker = addDisplacement(tracker, d, 1000);
        const afterPositive = tracker.totalDistance;
        tracker = addDisplacement(tracker, -5, 2000);
        expect(tracker.totalDistance).toBe(afterPositive);
      }),
      { numRuns: 100 }
    );
  });
});
