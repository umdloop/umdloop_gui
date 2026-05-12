#!/usr/bin/env bash
# kiosk-launcher.sh — Reads /etc/umdloop/monitors.json, validates against
# the schema, and launches one Chromium kiosk window per declared display.
#
# Requirements: 19.1, 19.2, 21.2, 21.3

set -euo pipefail

CONFIG_FILE="/etc/umdloop/monitors.json"
SCHEMA_FILE="$(dirname "$(realpath "$0")")/../config/monitors.schema.json"
GUI_BASE_URL="http://localhost:3000"

# --- Validate config exists ---
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ERROR: Monitor config not found at $CONFIG_FILE" >&2
  exit 1
fi

# --- Validate against JSON schema ---
# Requires python3 with jsonschema installed
if ! python3 -c "
import json, sys
try:
    from jsonschema import validate, ValidationError
except ImportError:
    print('ERROR: python3 jsonschema package is required', file=sys.stderr)
    sys.exit(1)

with open('$SCHEMA_FILE') as f:
    schema = json.load(f)
with open('$CONFIG_FILE') as f:
    config = json.load(f)

try:
    validate(instance=config, schema=schema)
except ValidationError as e:
    print(f'ERROR: Config validation failed: {e.message}', file=sys.stderr)
    sys.exit(1)
" 2>&1; then
  echo "ERROR: Schema validation failed for $CONFIG_FILE" >&2
  exit 1
fi

# --- Parse config and launch Chromium windows ---
python3 -c "
import json, subprocess, sys

with open('$CONFIG_FILE') as f:
    config = json.load(f)

for display in config['displays']:
    slot = display['monitor_slot']
    x_idx = display['x_display_index']

    # slot-3 gets the root path (mission selector); others get /idle
    if slot == 'slot-3':
        path = '?monitor=slot-3'
    else:
        path = 'idle?monitor=' + slot

    url = '$GUI_BASE_URL/' + path
    env_display = ':0.' + str(x_idx)

    print(f'Launching Chromium on DISPLAY={env_display} -> {url}')
    subprocess.Popen(
        ['chromium-browser', '--kiosk', '--noerrdialogs',
         '--disable-infobars', '--no-first-run', url],
        env={**__import__('os').environ, 'DISPLAY': env_display},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
"

echo "Kiosk launcher complete."
