import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SLOT_ROLE_MAP,
  MISSIONS,
  SLOTS,
  getRole,
  getDefaultTab,
  resolveRoleUrl,
} from '../../app/lib/mission-mapping.js';

/**
 * **Feature: gui-reorganization, Property 1: Slot-to-role mapping is total and deterministic**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * For any valid Mission identifier and for any Monitor Slot in {slot-1..slot-5},
 * the mapping function getRole(mission, slot) SHALL return exactly one Operator Role string,
 * and that string SHALL match the role defined in the requirements for that (mission, slot) pair.
 */
describe('Property 1: Slot-to-role mapping is total and deterministic', () => {
  // Expected mapping from requirements 4.1–4.4
  const EXPECTED = {
    delivery: ['rover-technician', 'arm-operator', 'rover-operator', 'navigator', 'drone-operator'],
    'equipment-servicing': ['rover-technician', 'arm-operator', 'rover-operator', 'auxiliary-1', 'auxiliary-2'],
    'autonomous-navigation': ['rover-technician', 'rover-operator', 'navigator-1', 'navigator-2', 'camera-operator'],
    science: ['rover-technician', 'equipment-specialist', 'spectrometer-scientist', 'fluorometer-scientist', 'rover-operator'],
  };

  const missionArb = fc.constantFrom(...MISSIONS);
  const slotArb = fc.constantFrom(...SLOTS);

  it('getRole returns a string for every valid (mission, slot) pair', () => {
    fc.assert(
      fc.property(missionArb, slotArb, (mission, slot) => {
        const role = getRole(mission, slot);
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('getRole matches the expected role for every (mission, slot) pair', () => {
    fc.assert(
      fc.property(missionArb, slotArb, (mission, slot) => {
        const role = getRole(mission, slot);
        const slotIndex = SLOTS.indexOf(slot);
        expect(role).toBe(EXPECTED[mission][slotIndex]);
      }),
      { numRuns: 100 }
    );
  });

  it('getRole is deterministic — same inputs always produce same output', () => {
    fc.assert(
      fc.property(missionArb, slotArb, (mission, slot) => {
        const role1 = getRole(mission, slot);
        const role2 = getRole(mission, slot);
        expect(role1).toBe(role2);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: gui-reorganization, Property 2: Role URL resolution correctness**
 * **Validates: Requirements 4.5**
 *
 * For any valid (mission, slot) pair, the resolved URL SHALL match
 * `/missions/<mission>/<role>` when the role has no tabs, and
 * `/missions/<mission>/<role>/<default-tab>` when the role declares tabs.
 */
describe('Property 2: Role URL resolution correctness', () => {
  const missionArb = fc.constantFrom(...MISSIONS);
  const slotArb = fc.constantFrom(...SLOTS);

  // Roles that have tabs and their expected default tabs
  const TABBED_ROLES = {
    'delivery/navigator': 'main-map',
    'science/spectrometer-scientist': 'site-1',
    'science/fluorometer-scientist': 'site-1',
    'science/rover-operator': 'rover-cameras',
  };

  it('resolveRoleUrl produces correct URL format for all (mission, slot) pairs', () => {
    fc.assert(
      fc.property(missionArb, slotArb, (mission, slot) => {
        const url = resolveRoleUrl(mission, slot);
        const role = getRole(mission, slot);
        const tab = getDefaultTab(mission, role);

        if (tab) {
          expect(url).toBe(`/missions/${mission}/${role}/${tab}`);
        } else {
          expect(url).toBe(`/missions/${mission}/${role}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('resolveRoleUrl appends default tab only for roles that declare tabs', () => {
    fc.assert(
      fc.property(missionArb, slotArb, (mission, slot) => {
        const url = resolveRoleUrl(mission, slot);
        const role = getRole(mission, slot);
        const key = `${mission}/${role}`;
        const segments = url.split('/').filter(Boolean);

        if (TABBED_ROLES[key]) {
          // Should have 4 segments: missions, <mission>, <role>, <tab>
          expect(segments).toHaveLength(4);
          expect(segments[3]).toBe(TABBED_ROLES[key]);
        } else {
          // Should have 3 segments: missions, <mission>, <role>
          expect(segments).toHaveLength(3);
        }
      }),
      { numRuns: 100 }
    );
  });
});
