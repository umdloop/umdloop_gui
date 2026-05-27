#!/usr/bin/env python3
"""
Add or update a tile region around a GNSS point.

Downloads MapTiler satellite tiles for a circle of given radius into a
per-region MBTiles cache, converts to public/regions/<name>.pmtiles, and
edits app/config/regions.js to register (or update) the region entry.

Re-running with the same --name updates that region in place:
  - the MBTiles cache is reused (only missing tiles are fetched)
  - the .pmtiles file is rebuilt
  - the regions.js entry is overwritten with new lat/lon/zoom/label

Usage:
  scripts/add_region.py --name mdrs --lat 38.425 --lon -110.785 --radius-km 3
  scripts/add_region.py --name umd  --lat 38.9897 --lon -76.9378 --radius-km 1.5 \\
      --min-zoom 12 --max-zoom 18 --label "UMD / College Park"

Requires the `pmtiles` CLI on PATH (brew install pmtiles).
"""
import argparse
import math
import re
import sqlite3
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

MAPTILER_KEY = "DDQqKsPBfdOZOVxgcoy5"
DEFAULT_MIN_ZOOM = 12
DEFAULT_MAX_ZOOM = 18

SCRIPT_DIR = Path(__file__).resolve().parent
WEB_ROOT = SCRIPT_DIR.parent
REGIONS_DIR = WEB_ROOT / "public" / "regions"
CACHE_DIR = REGIONS_DIR / ".cache"
REGIONS_JS = WEB_ROOT / "app" / "config" / "regions.js"
MARKER_START = "// REGIONS-START"
MARKER_END = "// REGIONS-END"


def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def bbox_from_center_radius(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    dlat = radius_km / 111.32
    dlon = radius_km / (111.32 * math.cos(math.radians(lat)))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


def open_mbtiles(path: Path, name: str, min_z: int, max_z: int) -> sqlite3.Connection:
    """Open (or create) an MBTiles SQLite file with the standard schema."""
    fresh = not path.exists()
    conn = sqlite3.connect(path)
    if fresh:
        conn.executescript(
            """
            CREATE TABLE metadata (name TEXT, value TEXT);
            CREATE TABLE tiles (
                zoom_level INTEGER,
                tile_column INTEGER,
                tile_row INTEGER,
                tile_data BLOB,
                PRIMARY KEY (zoom_level, tile_column, tile_row)
            );
            """
        )
    # Refresh metadata each run.
    conn.execute("DELETE FROM metadata")
    conn.executemany(
        "INSERT INTO metadata VALUES (?, ?)",
        [
            ("name", name),
            ("format", "jpg"),
            ("minzoom", str(min_z)),
            ("maxzoom", str(max_z)),
            ("type", "baselayer"),
        ],
    )
    conn.commit()
    return conn


def download_into_mbtiles(
    conn: sqlite3.Connection,
    lat: float, lon: float, radius_km: float,
    min_z: int, max_z: int,
) -> tuple[int, int, int]:
    mn_lat, mx_lat, mn_lon, mx_lon = bbox_from_center_radius(lat, lon, radius_km)
    downloaded = skipped = errors = 0

    for z in range(min_z, max_z + 1):
        x_min, y_max = lat_lon_to_tile(mn_lat, mn_lon, z)
        x_max, y_min = lat_lon_to_tile(mx_lat, mx_lon, z)
        flip = (1 << z) - 1
        count = (x_max - x_min + 1) * (y_max - y_min + 1)
        print(f"  z{z}: {count} tiles (x {x_min}-{x_max}, y {y_min}-{y_max})")

        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                tms_y = flip - y
                cur = conn.execute(
                    "SELECT 1 FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
                    (z, x, tms_y),
                )
                if cur.fetchone() is not None:
                    skipped += 1
                    continue

                url = f"https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={MAPTILER_KEY}"
                try:
                    with urllib.request.urlopen(url, timeout=20) as resp:
                        blob = resp.read()
                    conn.execute(
                        "INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)",
                        (z, x, tms_y, blob),
                    )
                    downloaded += 1
                    if downloaded % 100 == 0:
                        conn.commit()
                        print(f"    {downloaded} downloaded, {skipped} cached")
                    time.sleep(0.05)
                except Exception as e:
                    errors += 1
                    print(f"    ERROR {z}/{x}/{y}: {e}")

    conn.commit()
    return downloaded, skipped, errors


def convert_to_pmtiles(mbtiles: Path, pmtiles: Path) -> None:
    if pmtiles.exists():
        pmtiles.unlink()
    subprocess.run(["pmtiles", "convert", str(mbtiles), str(pmtiles)], check=True)


def update_regions_js(name: str, label: str, lat: float, lon: float, default_zoom: int) -> None:
    if not REGIONS_JS.exists():
        raise SystemExit(f"{REGIONS_JS} not found")

    src = REGIONS_JS.read_text()
    if MARKER_START not in src or MARKER_END not in src:
        raise SystemExit(f"Markers {MARKER_START!r}/{MARKER_END!r} missing from {REGIONS_JS}")

    pre, rest = src.split(MARKER_START, 1)
    _, post = rest.split(MARKER_END, 1)

    # Parse existing entries (best-effort: each top-level "key: { ... }," block).
    entries = parse_region_entries(rest.split(MARKER_END, 1)[0])
    entries[name] = {
        "label": label,
        "pmtiles": f"/regions/{name}.pmtiles",
        "center": [lon, lat],
        "zoom": default_zoom,
    }

    rendered = render_regions_block(entries)
    REGIONS_JS.write_text(f"{pre}{MARKER_START}\n{rendered}\n{MARKER_END}{post}")


def parse_region_entries(block: str) -> dict[str, dict]:
    """Parse the body of the REGIONS object into {key: {label, pmtiles, center, zoom}}."""
    entries: dict[str, dict] = {}
    # Each entry: <key>: { label: "...", pmtiles: "...", center: [lon, lat], zoom: N },
    pattern = re.compile(
        r'(?P<key>[A-Za-z_][\w-]*)\s*:\s*\{\s*'
        r'label:\s*"(?P<label>[^"]*)"\s*,\s*'
        r'pmtiles:\s*"(?P<pmtiles>[^"]*)"\s*,\s*'
        r'center:\s*\[\s*(?P<lon>-?[\d.]+)\s*,\s*(?P<lat>-?[\d.]+)\s*\]\s*,\s*'
        r'zoom:\s*(?P<zoom>\d+)\s*,?\s*'
        r'\}\s*,?',
        re.DOTALL,
    )
    for m in pattern.finditer(block):
        entries[m.group("key")] = {
            "label": m.group("label"),
            "pmtiles": m.group("pmtiles"),
            "center": [float(m.group("lon")), float(m.group("lat"))],
            "zoom": int(m.group("zoom")),
        }
    return entries


def render_regions_block(entries: dict[str, dict]) -> str:
    lines = ["export const REGIONS = {"]
    for key, e in entries.items():
        lon, lat = e["center"]
        lines.append(f"  {key}: {{")
        lines.append(f'    label: "{e["label"]}",')
        lines.append(f'    pmtiles: "{e["pmtiles"]}",')
        lines.append(f"    center: [{lon}, {lat}],")
        lines.append(f"    zoom: {e['zoom']},")
        lines.append("  },")
    lines.append("};")
    return "\n".join(lines)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--name", required=True, help="Region key (also output filename)")
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    p.add_argument("--radius-km", type=float, required=True, dest="radius_km")
    p.add_argument("--min-zoom", type=int, default=DEFAULT_MIN_ZOOM, dest="min_zoom")
    p.add_argument("--max-zoom", type=int, default=DEFAULT_MAX_ZOOM, dest="max_zoom")
    p.add_argument("--label", default=None, help="Display label (default: name)")
    args = p.parse_args()

    if not re.fullmatch(r"[A-Za-z_][\w-]*", args.name):
        raise SystemExit(f"Invalid region name: {args.name!r}")

    REGIONS_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    mbtiles = CACHE_DIR / f"{args.name}.mbtiles"
    pmtiles_path = REGIONS_DIR / f"{args.name}.pmtiles"
    updating = pmtiles_path.exists() or mbtiles.exists()
    print(f"{'Updating' if updating else 'Adding'} region {args.name!r}")
    print(f"  center=({args.lat}, {args.lon}) radius={args.radius_km} km zooms={args.min_zoom}-{args.max_zoom}")

    conn = open_mbtiles(mbtiles, args.name, args.min_zoom, args.max_zoom)
    try:
        dl, sk, err = download_into_mbtiles(
            conn, args.lat, args.lon, args.radius_km, args.min_zoom, args.max_zoom,
        )
    finally:
        conn.close()
    print(f"Tiles: {dl} downloaded, {sk} cached, {err} errors")

    print(f"Building {pmtiles_path}")
    convert_to_pmtiles(mbtiles, pmtiles_path)
    size_mb = pmtiles_path.stat().st_size / (1024 * 1024)
    print(f"  {pmtiles_path.name}: {size_mb:.1f} MB")

    label = args.label or args.name
    default_zoom = min(args.max_zoom, 14)
    update_regions_js(args.name, label, args.lat, args.lon, default_zoom)
    print(f"Updated {REGIONS_JS.relative_to(WEB_ROOT)} (entry: {args.name})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
