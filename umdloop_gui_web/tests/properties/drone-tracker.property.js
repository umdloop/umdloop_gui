import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createDroneTracker,
  addDroneDisplacement,
  addBatteryReading,
  getDrainRate,
} from '../../app/drone/drone-tracker.js';

/**
 * **Feature: gui-reorganization, Property 14: Drone distance accumulation monotonicity**
 * **Validates: Requirements 17.1**
 *
 * For any sequence of drone GLOBAL_POSITION_INT updates with non-negative displacement,
 * the accumulated drone distance SHALL be monotonically non-decreasing.
 */
describe('Property 14: Drone distance accumulation monotonicity', () => {
  const displacementArb = fc.double({ min: 0, max: 5000, noNaN: true, noDefaultInfinity: true });

  it('accumulated drone distance is monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.array(displacementArb, { minLength: 1, maxLength: 50 }),
        (displacements) => {
          let tracker = createDroneTracker(0);
          let prevDistance = 0;
          let time = 1000;

          for (const d of displacements) {
            tracker = addDroneDisplacement(tracker, d, time);
            expect(tracker.totalDistance).toBeGreaterThanOrEqual(prevDistance);
            prevDistance = tracker.totalDistance;
            time += 1000;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total drone distance equals sum of all displacements', () => {
    fc.assert(
      fc.property(
        fc.array(displacementArb, { minLength: 1, maxLength: 50 }),
        (displacements) => {
          let tracker = createDroneTracker(0);
          let time = 1000;

          for (const d of displacements) {
            tracker = addDroneDisplacement(tracker, d, time);
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
        let tracker = createDroneTracker(0);
        tracker = addDroneDisplacement(tracker, d, 1000);
        const afterPositive = tracker.totalDistance;
        tracker = addDroneDisplacement(tracker, -10, 2000);
        expect(tracker.totalDistance).toBe(afterPositive);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: gui-reorganization, Property 15: Battery drain rate computation**
 * **Validates: Requirements 17.3**
 *
 * For any sequence of battery percentage readings over a 60-second window,
 * the computed drain rate in percent per minute SHALL equal
 * (first_pct - last_pct) / elapsed_minutes for the readings within that window.
 */
describe('Property 15: Battery drain rate computation', () => {
  it('drain rate equals (first_pct - last_pct) / elapsed_minutes', () => {
    // Generate a starting pct and an ending pct, plus a time span within 60s
    const pctArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });
    const elapsedMsArb = fc.integer({ min: 1000, max: 60000 });

    fc.assert(
      fc.property(pctArb, pctArb, elapsedMsArb, (firstPct, lastPct, elapsedMs) => {
        let tracker = createDroneTracker(0);
        const startTime = 10000;
        const endTime = startTime + elapsedMs;

        tracker = addBatteryReading(tracker, firstPct, startTime);
        tracker = addBatteryReading(tracker, lastPct, endTime);

        const rate = getDrainRate(tracker);
        const elapsedMinutes = elapsedMs / 60000;
        const expected = (firstPct - lastPct) / elapsedMinutes;

        expect(rate).not.toBeNull();
        expect(Math.abs(rate - expected)).toBeLessThanOrEqual(1e-9);
      }),
      { numRuns: 100 }
    );
  });

  it('drain rate with multiple readings uses first and last in window', () => {
    const pctArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });
    const countArb = fc.integer({ min: 3, max: 20 });

    fc.assert(
      fc.property(pctArb, pctArb, countArb, (startPct, endPct, count) => {
        let tracker = createDroneTracker(0);
        const baseTime = 10000;
        // Space readings evenly within 60 seconds
        const interval = Math.floor(59000 / (count - 1));

        for (let i = 0; i < count; i++) {
          // Linear interpolation from startPct to endPct
          const pct = startPct + (endPct - startPct) * (i / (count - 1));
          tracker = addBatteryReading(tracker, pct, baseTime + i * interval);
        }

        const rate = getDrainRate(tracker);
        const totalElapsedMs = (count - 1) * interval;
        const elapsedMinutes = totalElapsedMs / 60000;
        const expected = (startPct - endPct) / elapsedMinutes;

        expect(rate).not.toBeNull();
        expect(Math.abs(rate - expected)).toBeLessThanOrEqual(1e-6);
      }),
      { numRuns: 100 }
    );
  });

  it('returns null with fewer than 2 readings', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (pct) => {
          const tracker = createDroneTracker(0);
          expect(getDrainRate(tracker)).toBeNull();

          const withOne = addBatteryReading(tracker, pct, 1000);
          expect(getDrainRate(withOne)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
