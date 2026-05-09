#!/usr/bin/env python3
"""
Download satellite map tiles for offline use at competition.

Grabs MapTiler satellite tiles for a bounding box and saves them to
public/tiles/{z}/{x}/{y}.jpg so Next.js / Flask can serve them as static assets.

Usage (bounding box, original default):
    python3 scripts/download_tiles.py

Usage (center + radius):
    python3 scripts/download_tiles.py --lat 38.425 --lon -110.785 --radius-km 3

Usage (custom bbox + zoom):
    python3 scripts/download_tiles.py --min-lat 38.40 --max-lat 38.45 \
        --min-lon -110.81 --max-lon -110.76 --min-zoom 12 --max-zoom 18
"""

import argparse
import math
import os
import time
import urllib.request

# ── Configuration ──────────────────────────────────────────────────────────────

MAPTILER_KEY = "DDQqKsPBfdOZOVxgcoy5"

# Default bounding box (MDRS site, ~5 km)
DEFAULT_MIN_LAT = 38.400
DEFAULT_MAX_LAT = 38.450
DEFAULT_MIN_LON = -110.810
DEFAULT_MAX_LON = -110.760

DEFAULT_MIN_ZOOM = 12
DEFAULT_MAX_ZOOM = 18

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "tiles")

# ── Geometry helpers ───────────────────────────────────────────────────────────

def lat_lon_to_tile(lat, lon, zoom):
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def tile_range(min_lat, min_lon, max_lat, max_lon, zoom):
    x_min, y_max = lat_lon_to_tile(min_lat, min_lon, zoom)
    x_max, y_min = lat_lon_to_tile(max_lat, max_lon, zoom)
    return x_min, x_max, y_min, y_max


def bbox_from_center_radius(lat, lon, radius_km):
    """Return (min_lat, max_lat, min_lon, max_lon) covering a circle of radius_km."""
    delta_lat = radius_km / 111.32
    delta_lon = radius_km / (111.32 * math.cos(math.radians(lat)))
    return lat - delta_lat, lat + delta_lat, lon - delta_lon, lon + delta_lon

# ── Download ───────────────────────────────────────────────────────────────────

def download_tiles(min_lat, max_lat, min_lon, max_lon, min_zoom, max_zoom, output_dir=None):
    out = output_dir or OUTPUT_DIR
    os.makedirs(out, exist_ok=True)

    total = 0
    for z in range(min_zoom, max_zoom + 1):
        x_min, x_max, y_min, y_max = tile_range(min_lat, min_lon, max_lat, max_lon, z)
        total += (x_max - x_min + 1) * (y_max - y_min + 1)

    print(f"Downloading {total} tiles (zoom {min_zoom}-{max_zoom}) → {os.path.abspath(out)}")
    print(f"Bounding box: ({min_lat:.4f}, {min_lon:.4f}) to ({max_lat:.4f}, {max_lon:.4f})\n")

    downloaded = skipped = errors = 0

    for z in range(min_zoom, max_zoom + 1):
        x_min, x_max, y_min, y_max = tile_range(min_lat, min_lon, max_lat, max_lon, z)
        count = (x_max - x_min + 1) * (y_max - y_min + 1)
        print(f"Zoom {z}: {count} tiles  (x {x_min}-{x_max}, y {y_min}-{y_max})")

        for x in range(x_min, x_max + 1):
            x_dir = os.path.join(out, str(z), str(x))
            os.makedirs(x_dir, exist_ok=True)

            for y in range(y_min, y_max + 1):
                out_path = os.path.join(x_dir, f"{y}.jpg")
                if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                    skipped += 1
                    continue

                url = (
                    f"https://api.maptiler.com/tiles/satellite/"
                    f"{z}/{x}/{y}.jpg?key={MAPTILER_KEY}"
                )
                try:
                    urllib.request.urlretrieve(url, out_path)
                    downloaded += 1
                except Exception as e:
                    print(f"  ERROR {z}/{x}/{y}: {e}")
                    errors += 1

                done = downloaded + skipped + errors
                if done % 50 == 0 or done == total:
                    print(f"  Progress: {done}/{total} ({downloaded} new, {skipped} cached, {errors} errors)")

                time.sleep(0.05)

    print(f"\nDone. {downloaded} downloaded, {skipped} already cached, {errors} errors.")
    size_mb = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, fns in os.walk(out)
        for f in fns
    ) / (1024 * 1024)
    print(f"Total tile cache size: {size_mb:.1f} MB")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download MapTiler satellite tiles for offline use")

    # Center + radius mode
    parser.add_argument("--lat", type=float, help="Center latitude (use with --lon and --radius-km)")
    parser.add_argument("--lon", type=float, help="Center longitude (use with --lat and --radius-km)")
    parser.add_argument("--radius-km", type=float, dest="radius_km", help="Download radius in km")

    # Explicit bbox mode
    parser.add_argument("--min-lat", type=float, dest="min_lat", default=None)
    parser.add_argument("--max-lat", type=float, dest="max_lat", default=None)
    parser.add_argument("--min-lon", type=float, dest="min_lon", default=None)
    parser.add_argument("--max-lon", type=float, dest="max_lon", default=None)

    # Zoom range
    parser.add_argument("--min-zoom", type=int, dest="min_zoom", default=DEFAULT_MIN_ZOOM)
    parser.add_argument("--max-zoom", type=int, dest="max_zoom", default=DEFAULT_MAX_ZOOM)

    args = parser.parse_args()

    if args.lat is not None and args.lon is not None and args.radius_km is not None:
        print(f"Center+radius mode: ({args.lat}, {args.lon}), radius={args.radius_km} km")
        mn_lat, mx_lat, mn_lon, mx_lon = bbox_from_center_radius(args.lat, args.lon, args.radius_km)
    elif args.min_lat is not None:
        mn_lat, mx_lat, mn_lon, mx_lon = args.min_lat, args.max_lat, args.min_lon, args.max_lon
    else:
        print("No args provided — using default MDRS bounding box.")
        mn_lat, mx_lat, mn_lon, mx_lon = DEFAULT_MIN_LAT, DEFAULT_MAX_LAT, DEFAULT_MIN_LON, DEFAULT_MAX_LON

    download_tiles(mn_lat, mx_lat, mn_lon, mx_lon, args.min_zoom, args.max_zoom)
