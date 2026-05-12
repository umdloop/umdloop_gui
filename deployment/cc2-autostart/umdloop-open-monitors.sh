#!/bin/bash
# open-monitors.sh
# Opens three Chrome windows in fullscreen, one per monitor.
# Intended to run at login via XDG autostart.
#
# PREREQUISITES:
#   sudo apt install wmctrl xdotool google-chrome-stable
#
# CONFIGURATION:
#   Run `xrandr --query` to find your monitor offsets and update the
#   MONITOR_X array below. The values are the X pixel offset of each monitor.
#   Example xrandr output:
#     HDMI-1 connected 1920x1080+0+0       -> offset 0
#     HDMI-2 connected 1920x1080+1920+0    -> offset 1920
#     HDMI-3 connected 1920x1080+3840+0    -> offset 3840

# --- CONFIGURATION -----------------------------------------------------------
# X offsets for each monitor (left to right). Adjust to match your xrandr output.
MONITOR_X=(0 1920 3840)

# URLs to open on each monitor (index matches MONITOR_X)
URLS=(
  "http://localhost:3000/?monitor=slot-3"
  "http://localhost:3000/?monitor=slot-4"
  "http://localhost:3000/?monitor=slot-5"
)

# Monitor resolution (assumed uniform; adjust if monitors differ)
WIDTH=1920
HEIGHT=1080

# Delay (seconds) to wait for desktop environment to be ready
STARTUP_DELAY=3

# Delay between launching each Chrome window
LAUNCH_DELAY=2
# ------------------------------------------------------------------------------

sleep "$STARTUP_DELAY"

for i in 0 1 2; do
  # Launch Chrome with a unique user data dir to force separate windows/processes
  google-chrome \
    --new-window \
    --user-data-dir="/tmp/chrome-monitor-$i" \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-infobars \
    --disable-features=WebRtcHideLocalIpsWithMdns \
    "${URLS[$i]}" &

  sleep "$LAUNCH_DELAY"
done

# Give Chrome time to fully render all windows
sleep 3

# Move each window to its monitor and make it fullscreen
for i in 0 1 2; do
  # Find the window by matching the URL's unique identifier in the title
  SLOT="slot-$((i + 3))"
  WID=$(xdotool search --name "$SLOT" | head -1)

  if [ -n "$WID" ]; then
    # Remove any existing fullscreen/maximized state so we can reposition
    wmctrl -i -r "$WID" -b remove,fullscreen
    wmctrl -i -r "$WID" -b remove,maximized_vert,maximized_horz

    # Place a small window in the center of the target monitor so the WM
    # unambiguously associates it with that monitor when we fullscreen.
    WIN_W=800
    WIN_H=600
    CENTER_X=$(( ${MONITOR_X[$i]} + (WIDTH - WIN_W) / 2 ))
    CENTER_Y=$(( (HEIGHT - WIN_H) / 2 ))
    wmctrl -i -r "$WID" -e 0,$CENTER_X,$CENTER_Y,$WIN_W,$WIN_H

    sleep 0.5

    # Fullscreen on the monitor the window is now clearly inside of
    wmctrl -i -r "$WID" -b add,fullscreen
  else
    echo "WARNING: Could not find window for $SLOT"
  fi
done

echo "All monitor windows launched and positioned."
