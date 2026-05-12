#!/usr/bin/env bash
# setup-systemd.sh — Copies systemd unit files for the given target type
# to /etc/systemd/system/, runs daemon-reload, and enables each unit.
#
# Usage:
#   setup-systemd.sh <orin|cc>
#
# Requirements: 23.4, 23.6

set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
SYSTEMD_DIR="$SCRIPT_DIR/../systemd"

if [ $# -lt 1 ]; then
  echo "Usage: $(basename "$0") <orin|cc>" >&2
  exit 1
fi

TARGET="$1"

case "$TARGET" in
  orin|cc)
    ;;
  *)
    echo "ERROR: Invalid target type '$TARGET'. Must be 'orin' or 'cc'." >&2
    echo "Usage: $(basename "$0") <orin|cc>" >&2
    exit 1
    ;;
esac

SOURCE_DIR="$SYSTEMD_DIR/$TARGET"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Unit directory not found at $SOURCE_DIR" >&2
  exit 1
fi

echo "Installing systemd units from $SOURCE_DIR..."

for unit_file in "$SOURCE_DIR"/*.service; do
  [ -f "$unit_file" ] || continue
  unit_name="$(basename "$unit_file")"
  echo "  Copying $unit_name -> /etc/systemd/system/$unit_name"
  cp "$unit_file" "/etc/systemd/system/$unit_name"
done

echo "Running systemctl daemon-reload..."
systemctl daemon-reload

echo "Enabling installed units..."
for unit_file in "$SOURCE_DIR"/*.service; do
  [ -f "$unit_file" ] || continue
  unit_name="$(basename "$unit_file")"
  echo "  Enabling $unit_name"
  systemctl enable "$unit_name"
done

echo "Done. Units installed and enabled for target '$TARGET'."
