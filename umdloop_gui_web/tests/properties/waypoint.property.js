import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createWaypointStore,
  addWaypoint,
  isValidCoordinate,
} from '../../app/lib/waypoint-store.js';

/**
 * **Feature: gui-reorganization, Property 7: Waypoint validation invariants**
 * **Validates: Requirements 12.1, 12.2**
 *
 * For any latitude in [-90, 90] and longitude in [-180, 180], adding a waypoint
 * SHALL increase the list length by exactly one. For any latitude outside [-90, 90]
 * or longitude outside [-180, 180], the submission SHALL be rejected and the list
 * SHALL remain unchanged.
 */
describe('Property 7: Waypoint validation invariants', () => {
  const validLatArb = fc.double({ min: -90, max: 90, noNaN: true });
  const validLonArb = fc.double({ min: -180, max: 180, noNaN: true });

  // Generate latitudes outside [-90, 90]
  const invalidLatArb = fc.oneof(
    fc.double({ min: 90.0001, max: 1000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1000, max: -90.0001, noNaN: true, noDefaultInfinity: true })
  );

  // Generate longitudes outside [-180, 180]
  const invalidLonArb = fc.oneof(
    fc.double({ min: 180.0001, max: 1000, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -1000, max: -180.0001, noNaN: true, noDefaultInfinity: true })
  );

  it('valid coordinates increase waypoint list length by exactly one', () => {
    fc.assert(
      fc.property(validLatArb, validLonArb, (lat, lon) => {
        const store = createWaypointStore();
        const result = addWaypoint(store, lat, lon);
        expect(result).not.toBeNull();
        expect(result.waypoints.length).toBe(store.waypoints.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('valid coordinates produce a waypoint with the correct values', () => {
    fc.assert(
      fc.property(validLatArb, validLonArb, (lat, lon) => {
        const store = createWaypointStore();
        const result = addWaypoint(store, lat, lon);
        const added = result.waypoints[result.waypoints.length - 1];
        expect(added.latitude).toBe(lat);
        expect(added.longitude).toBe(lon);
        expect(added.index).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid latitude rejects submission and leaves list unchanged', () => {
    fc.assert(
      fc.property(invalidLatArb, validLonArb, (lat, lon) => {
        const store = createWaypointStore();
        const result = addWaypoint(store, lat, lon);
        expect(result).toBeNull();
        expect(store.waypoints.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid longitude rejects submission and leaves list unchanged', () => {
    fc.assert(
      fc.property(validLatArb, invalidLonArb, (lat, lon) => {
        const store = createWaypointStore();
        const result = addWaypoint(store, lat, lon);
        expect(result).toBeNull();
        expect(store.waypoints.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('NaN and Infinity coordinates are rejected', () => {
    const store = createWaypointStore();
    expect(addWaypoint(store, NaN, 0)).toBeNull();
    expect(addWaypoint(store, 0, NaN)).toBeNull();
    expect(addWaypoint(store, Infinity, 0)).toBeNull();
    expect(addWaypoint(store, 0, -Infinity)).toBeNull();
  });

  it('sequential additions produce correct ordinal indices', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(validLatArb, validLonArb), { minLength: 1, maxLength: 20 }),
        (coords) => {
          let store = createWaypointStore();
          for (const [lat, lon] of coords) {
            store = addWaypoint(store, lat, lon);
          }
          expect(store.waypoints.length).toBe(coords.length);
          for (let i = 0; i < store.waypoints.length; i++) {
            expect(store.waypoints[i].index).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
