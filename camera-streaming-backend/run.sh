#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect local LAN IP (first non-loopback IPv4)
detect_ip() {
    if command -v ip &>/dev/null; then
        ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1
    else
        # macOS
        route get 1.1.1.1 2>/dev/null | awk '/interface:/{print $2}' | \
            xargs -I{} ipconfig getifaddr {} 2>/dev/null | head -1
    fi
}

STUN_IP="${STUN_IP:-$(detect_ip)}"

if [ -z "$STUN_IP" ]; then
    echo "ERROR: Could not detect LAN IP. Set STUN_IP=<your-ip> and re-run." >&2
    exit 1
fi

echo "Using STUN server at $STUN_IP:3478"

# Kill any leftover instances from a previous run
pkill -f turnserver 2>/dev/null || true
pkill -f camera-stream 2>/dev/null || true

# Start coturn (STUN only, no auth, no logging noise)
turnserver --no-auth --stun-only --log-file /dev/null &
STUN_PID=$!

cleanup() {
    kill "$STUN_PID" 2>/dev/null || true
    kill "$CAM_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$SCRIPT_DIR/build/camera-stream" --stun-ip "$STUN_IP" "$@" &
CAM_PID=$!
wait "$CAM_PID"
