/**
 * Map tile source configuration.
 *
 * Returns the appropriate tile source based on NEXT_PUBLIC_USE_LOCAL_TILES.
 * When "true", uses offline tiles from /tiles/{z}/{x}/{y}.jpg.
 * Otherwise, uses MapTiler satellite endpoint.
 *
 * Requirements: 14.1, 14.2
 */

import { useLocalTiles } from "../../config";

/** MapTiler satellite tile URL (requires internet). */
const MAPTILER_URL =
  "https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=get_your_own_key";

/** Local offline tile URL pattern. */
const LOCAL_TILE_URL = "/tiles/{z}/{x}/{y}.jpg";

/**
 * Returns the raster tile source configuration for MapLibre.
 * @returns {{ type: string, tiles: string[], tileSize: number, maxzoom: number }}
 */
export function getTileSource() {
  const url = useLocalTiles() ? LOCAL_TILE_URL : MAPTILER_URL;

  return {
    type: "raster",
    tiles: [url],
    tileSize: 256,
    maxzoom: 18,
  };
}
