#!/usr/bin/env python3
"""
Convert a Z/X/Y JPEG tile directory into a single .pmtiles archive.

Usage:
  scripts/build_pmtiles.py <tile_dir> <out.pmtiles> [--name NAME]

Requires the `pmtiles` CLI (https://github.com/protomaps/go-pmtiles) on PATH:
  brew install pmtiles

Pipeline: tile_dir -> temporary .mbtiles (SQLite) -> pmtiles convert.
MBTiles stores rows in TMS order (y inverted); XYZ dirs are flipped on import.
"""
import argparse
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path


def build_mbtiles(tile_dir: Path, mbtiles_path: Path, name: str) -> tuple[int, int, int]:
    conn = sqlite3.connect(mbtiles_path)
    cur = conn.cursor()
    cur.executescript(
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

    count = 0
    min_z, max_z = None, None
    for z_dir in sorted(tile_dir.iterdir()):
        if not z_dir.is_dir() or not z_dir.name.isdigit():
            continue
        z = int(z_dir.name)
        min_z = z if min_z is None else min(min_z, z)
        max_z = z if max_z is None else max(max_z, z)
        flip = (1 << z) - 1
        for x_dir in z_dir.iterdir():
            if not x_dir.is_dir() or not x_dir.name.isdigit():
                continue
            x = int(x_dir.name)
            for tile_path in x_dir.glob("*.jpg"):
                stem = tile_path.stem
                if not stem.isdigit():
                    continue
                y = int(stem)
                tms_y = flip - y
                with open(tile_path, "rb") as fh:
                    cur.execute(
                        "INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?)",
                        (z, x, tms_y, fh.read()),
                    )
                count += 1

    if count == 0:
        raise SystemExit(f"No .jpg tiles found under {tile_dir}")

    metadata = {
        "name": name,
        "format": "jpg",
        "minzoom": str(min_z),
        "maxzoom": str(max_z),
        "type": "baselayer",
    }
    cur.executemany("INSERT INTO metadata VALUES (?, ?)", metadata.items())
    conn.commit()
    conn.close()
    return count, min_z, max_z


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("tile_dir", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--name", default=None, help="Archive display name (default: out filename stem)")
    args = p.parse_args()

    if not args.tile_dir.is_dir():
        raise SystemExit(f"{args.tile_dir} is not a directory")

    name = args.name or args.out.stem
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        mb = Path(td) / "tiles.mbtiles"
        print(f"Indexing {args.tile_dir} -> {mb}")
        count, min_z, max_z = build_mbtiles(args.tile_dir, mb, name)
        print(f"  {count} tiles, z{min_z}-z{max_z}")

        print(f"Converting -> {args.out}")
        subprocess.run(["pmtiles", "convert", str(mb), str(args.out)], check=True)

    size_mb = args.out.stat().st_size / (1024 * 1024)
    print(f"Done: {args.out} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
