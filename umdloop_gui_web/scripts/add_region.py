#!/usr/bin/env python3
"""
Build a region tile bundle (.pmtiles) from a GNSS point + radius.

Downloads satellite tiles around the point (using download_tiles.py),
bundles them into public/regions/<name>.pmtiles, and prints the JS
snippet to paste into app/config/regions.js.

Usage:
    scripts/add_region.py --name mdrs --lat 38.425 --lon -110.785 --radius-km 3
    scripts/add_region.py --name umd --lat 38.9897 --lon -76.9378 --radius-km 1.5 \
        --min-zoom 12 --max-zoom 18

Requires the `pmtiles` CLI on PATH (brew install pmtiles).
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Reuse the existing downloader (same dir).
sys.path.insert(0, str(Path(__file__).resolve().parent))
import download_tiles  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
WEB_ROOT = SCRIPT_DIR.parent
REGIONS_DIR = WEB_ROOT / "public" / "regions"
BUILD_PMTILES = SCRIPT_DIR / "build_pmtiles.py"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--name", required=True, help="Region key (e.g. mdrs, umd) — used as filename and config key")
    p.add_argument("--lat", type=float, required=True, help="Center latitude")
    p.add_argument("--lon", type=float, required=True, help="Center longitude")
    p.add_argument("--radius-km", type=float, required=True, dest="radius_km", help="Coverage radius in km")
    p.add_argument("--min-zoom", type=int, default=download_tiles.DEFAULT_MIN_ZOOM, dest="min_zoom")
    p.add_argument("--max-zoom", type=int, default=download_tiles.DEFAULT_MAX_ZOOM, dest="max_zoom")
    p.add_argument("--label", default=None, help="Display label (default: name)")
    p.add_argument("--keep-tiles", action="store_true", help="Don't delete the staging tile dir after bundling")
    args = p.parse_args()

    if not args.name.replace("-", "").replace("_", "").isalnum():
        raise SystemExit(f"Invalid region name: {args.name!r} (use alphanumeric / -_ only)")

    REGIONS_DIR.mkdir(parents=True, exist_ok=True)
    out_pmtiles = REGIONS_DIR / f"{args.name}.pmtiles"

    with tempfile.TemporaryDirectory(prefix=f"region-{args.name}-", dir=WEB_ROOT / "public") as staging:
        staging_path = Path(staging)
        print(f"[1/2] Downloading tiles around ({args.lat}, {args.lon}) r={args.radius_km}km")
        mn_lat, mx_lat, mn_lon, mx_lon = download_tiles.bbox_from_center_radius(
            args.lat, args.lon, args.radius_km
        )
        download_tiles.download_tiles(
            mn_lat, mx_lat, mn_lon, mx_lon,
            args.min_zoom, args.max_zoom,
            output_dir=str(staging_path),
        )

        print(f"\n[2/2] Building {out_pmtiles}")
        subprocess.run(
            [sys.executable, str(BUILD_PMTILES), str(staging_path), str(out_pmtiles),
             "--name", args.name],
            check=True,
        )

        if args.keep_tiles:
            keep_dir = WEB_ROOT / "public" / "tiles"
            keep_dir.mkdir(parents=True, exist_ok=True)
            for child in staging_path.iterdir():
                dest = keep_dir / child.name
                if dest.exists():
                    shutil.rmtree(dest) if dest.is_dir() else dest.unlink()
                shutil.move(str(child), str(dest))
            print(f"Staging tiles preserved at {keep_dir}")

    label = args.label or args.name
    print("\n" + "=" * 60)
    print(f"Add this entry to umdloop_gui_web/app/config/regions.js:")
    print("=" * 60)
    print(f"""  {args.name}: {{
    label: "{label}",
    pmtiles: "/regions/{args.name}.pmtiles",
    center: [{args.lon}, {args.lat}],
    zoom: {min(args.max_zoom, 14)},
  }},""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
