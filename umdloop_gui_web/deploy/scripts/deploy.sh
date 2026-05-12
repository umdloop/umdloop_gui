#!/usr/bin/env bash
# deploy.sh — Deploys the latest code to a target host via SSH.
# Pulls the latest git commit, installs dependencies, builds the GUI,
# and restarts the affected systemd units.
#
# Usage:
#   deploy.sh <host>
#
# Where <host> is one of: orin, cc1, cc2
#
# Requirements: 22.1, 22.2

set -euo pipefail

REMOTE_DIR="/opt/umdloop/umdloop_gui_web"

# Host alias to SSH target mapping
declare -A HOST_MAP=(
  [orin]="192.168.88.90"
  [cc1]="192.168.88.11"
  [cc2]="192.168.88.10"
)

# Units to restart per host type
declare -A UNITS_MAP=(
  [orin]="umdloop-backend.service umdloop-rosbridge.service"
  [cc1]="umdloop-gui.service umdloop-kiosk.service"
  [cc2]="umdloop-gui.service umdloop-kiosk.service umdloop-mission-sync.service"
)

if [ $# -lt 1 ]; then
  echo "Usage: $(basename "$0") <orin|cc1|cc2>" >&2
  exit 1
fi

HOST="$1"

if [ -z "${HOST_MAP[$HOST]+x}" ]; then
  echo "ERROR: Unknown host '$HOST'. Must be one of: orin, cc1, cc2." >&2
  echo "Usage: $(basename "$0") <orin|cc1|cc2>" >&2
  exit 1
fi

TARGET="${HOST_MAP[$HOST]}"
UNITS="${UNITS_MAP[$HOST]}"

echo "Deploying to $HOST ($TARGET)..."

echo "  Pulling latest code..."
ssh "$TARGET" "cd $REMOTE_DIR && git pull"

echo "  Installing npm dependencies..."
ssh "$TARGET" "cd $REMOTE_DIR && npm ci"

echo "  Building Next.js application..."
ssh "$TARGET" "cd $REMOTE_DIR && npm run build"

echo "  Restarting systemd units: $UNITS"
for unit in $UNITS; do
  ssh "$TARGET" "sudo systemctl restart $unit"
done

echo "Deploy to $HOST complete."
