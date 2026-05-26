/**
 * Mission-region tile bundles. Each region maps to a single .pmtiles file
 * served from /regions/<key>.pmtiles. To add a region: drop the .pmtiles
 * file in public/regions/ and add an entry here.
 *
 * Build a region bundle from a Z/X/Y tile dir:
 *   scripts/build_pmtiles.py public/tiles public/regions/<key>.pmtiles --name <key>
 */
export const REGIONS = {
  umd: {
    label: "UMD / College Park",
    pmtiles: "/regions/umd.pmtiles",
    center: [-76.9378, 38.9897],
    zoom: 13,
  },
};

const STORAGE_KEY = "active-region";

export function getActiveRegionKey() {
  if (typeof window !== "undefined") {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored && REGIONS[stored]) return stored;
    if (window.__ACTIVE_REGION__) return window.__ACTIVE_REGION__;
  }
  return process.env.NEXT_PUBLIC_ACTIVE_REGION || "umd";
}

export function setActiveRegionKey(key) {
  if (typeof window === "undefined") return;
  if (!REGIONS[key]) return;
  window.localStorage?.setItem(STORAGE_KEY, key);
}

export function getActiveRegion() {
  const key = getActiveRegionKey();
  return REGIONS[key] || REGIONS.umd;
}
