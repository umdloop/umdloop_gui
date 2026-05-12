#!/usr/bin/env bash
# setup-monitors.sh — Copies the example monitor config for the given host
# to /etc/umdloop/monitors.json, creating the directory if absent.
#
# Usage:
#   setup-monitors.sh <cc1|cc2>
#
# Requirements: 23.5, 23.6

set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
CONFIG_DIR="$SCRIPT_DIR/../config"
TARGET_DIR="/etc/umdloop"
TARGET_FILE="$TARGET_DIR/monitors.json"

if [ $# -lt 1 ]; then
  echo "Usage: $(basename "$0") <cc1|cc2>" >&2
  exit 1
fi

HOST_ID="$1"

case "$HOST_ID" in
  cc1|cc2)
    ;;
  *)
    echo "ERROR: Invalid host identifier '$HOST_ID'. Must be 'cc1' or 'cc2'." >&2
    echo "Usage: $(basename "$0") <cc1|cc2>" >&2
    exit 1
    ;;
esac

SOURCE_FILE="$CONFIG_DIR/monitors.${HOST_ID}.example.json"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "ERROR: Example config not found at $SOURCE_FILE" >&2
  exit 1
fi

# Create target directory if absent
if [ ! -d "$TARGET_DIR" ]; then
  echo "Creating $TARGET_DIR..."
  mkdir -p "$TARGET_DIR"
fi

echo "Copying $SOURCE_FILE -> $TARGET_FILE"
cp "$SOURCE_FILE" "$TARGET_FILE"

echo "Done. Monitor config installed for host '$HOST_ID'."
