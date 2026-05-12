/**
 * Mission-to-role mapping for the UMD Loop multi-monitor operator console.
 *
 * Each mission assigns one operator role per monitor slot (slot-1 through slot-5).
 * Roles with sub-screens declare default tabs for URL resolution.
 */

/** Valid mission identifiers. */
export const MISSIONS = [
  'delivery',
  'equipment-servicing',
  'autonomous-navigation',
  'science',
];

/** Valid monitor slot identifiers. */
export const SLOTS = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5'];

/**
 * Maps each mission to an ordered array of operator roles (index 0 = slot-1).
 */
export const SLOT_ROLE_MAP = {
  delivery: ['rover-technician', 'arm-operator', 'rover-operator', 'navigator', 'drone-operator'],
  'equipment-servicing': ['rover-technician', 'arm-operator', 'rover-operator', 'auxiliary-1', 'auxiliary-2'],
  'autonomous-navigation': ['rover-technician', 'rover-operator', 'navigator-1', 'navigator-2', 'camera-operator'],
  science: ['rover-technician', 'equipment-specialist', 'spectrometer-scientist', 'fluorometer-scientist', 'rover-operator'],
};

/**
 * Default tabs for roles that have sub-screens.
 * Key format: "<mission>/<role>"
 */
const DEFAULT_TABS = {
  'delivery/navigator': 'main-map',
  'science/spectrometer-scientist': 'site-1',
  'science/fluorometer-scientist': 'site-1',
  'science/rover-operator': 'rover-cameras',
};

/**
 * Returns the operator role for a given mission and monitor slot.
 * @param {string} mission - One of the MISSIONS identifiers.
 * @param {string} slot - One of 'slot-1' through 'slot-5'.
 * @returns {string} The operator role string.
 */
export function getRole(mission, slot) {
  const roles = SLOT_ROLE_MAP[mission];
  if (!roles) {
    throw new Error(`Unknown mission: ${mission}`);
  }
  const index = SLOTS.indexOf(slot);
  if (index === -1) {
    throw new Error(`Unknown slot: ${slot}`);
  }
  return roles[index];
}

/**
 * Returns the default tab for a role, or null if the role has no tabs.
 * @param {string} mission - Mission identifier.
 * @param {string} role - Operator role string.
 * @returns {string|null} Default tab segment or null.
 */
export function getDefaultTab(mission, role) {
  return DEFAULT_TABS[`${mission}/${role}`] || null;
}

/**
 * Resolves the full URL path for a given mission and monitor slot.
 * Returns `/missions/<mission>/<role>` for single-screen roles,
 * or `/missions/<mission>/<role>/<default-tab>` for roles with tabs.
 * @param {string} mission - Mission identifier.
 * @param {string} slot - Monitor slot identifier.
 * @returns {string} The resolved URL path.
 */
export function resolveRoleUrl(mission, slot) {
  const role = getRole(mission, slot);
  const tab = getDefaultTab(mission, role);
  if (tab) {
    return `/missions/${mission}/${role}/${tab}`;
  }
  return `/missions/${mission}/${role}`;
}
