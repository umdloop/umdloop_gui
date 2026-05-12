# Testing Procedure for open-monitors.sh

## Prerequisites

Run these on your Linux VM:

```bash
sudo apt install wmctrl xdotool google-chrome-stable
```

If `google-chrome-stable` isn't available, use `chromium-browser` and update the
script to reference `chromium-browser` instead of `google-chrome`.

---

## Step 1: Verify Monitor Layout

```bash
xrandr --query
```

Look for lines like:

```
HDMI-1 connected 1920x1080+0+0
HDMI-2 connected 1920x1080+1920+0
HDMI-3 connected 1920x1080+3840+0
```

The `+X+Y` values are the offsets. Update the `MONITOR_X` array in
`open-monitors.sh` if they differ from `(0 1920 3840)`.

If you only have one monitor on the VM, you can simulate multiple monitors with
`xrandr`:

```bash
# Create a virtual 5760x1080 screen split into three 1920x1080 regions
xrandr --output Virtual-1 --mode 5760x1080
```

Or just test with one monitor and verify the window placement logic works
(the window will move off-screen for monitors 2 and 3, which is expected).

---

## Step 2: Make the Script Executable

```bash
chmod +x open-monitors.sh
```

---

## Step 3: Run the Script Manually

```bash
./open-monitors.sh
```

**Expected result:**
- Three Chrome windows open, each loading a different `slot-N` URL.
- Each window is moved to its respective monitor position.
- Each window enters fullscreen mode.

---

## Step 4: Verify Window Placement

While the script is running (or after it completes), check window positions:

```bash
wmctrl -l -G
```

This lists all windows with their geometry. You should see three Chrome windows
with X positions matching your `MONITOR_X` values (0, 1920, 3840).

---

## Step 5: Verify Fullscreen State

```bash
xprop -id <WINDOW_ID> | grep _NET_WM_STATE
```

Replace `<WINDOW_ID>` with the hex ID from `wmctrl -l`. You should see
`_NET_WM_STATE_FULLSCREEN` in the output.

Alternatively, just visually confirm each window is fullscreen on its monitor.

---

## Step 6: Test Window Title Matching

If the script prints `WARNING: Could not find window for slot-X`, the page
title doesn't contain the slot identifier. Debug with:

```bash
xdotool search --name "slot-3"
```

If this returns nothing, Chrome hasn't set the window title yet (page hasn't
loaded) or your page's `<title>` tag doesn't include "slot-3". Solutions:

1. Increase `LAUNCH_DELAY` or the final `sleep` in the script.
2. Ensure your web app sets `<title>` to include the slot identifier, e.g.:
   ```html
   <title>Dashboard - slot-3</title>
   ```
3. As a fallback, match by `--class` instead of `--name`:
   ```bash
   xdotool search --class "chrome" | head -1
   ```

---

## Step 7: Test Autostart (Full Boot Simulation)

1. Copy files into place:

```bash
# Copy the script
mkdir -p ~/.local/bin
cp open-monitors.sh ~/.local/bin/open-monitors.sh
chmod +x ~/.local/bin/open-monitors.sh

# Copy the .desktop file
mkdir -p ~/.config/autostart
cp open-monitors.desktop ~/.config/autostart/open-monitors.desktop
```

2. Update the `Exec=` path in the `.desktop` file if your username isn't `cc2`:

```bash
sed -i "s|/home/cc2|$HOME|" ~/.config/autostart/open-monitors.desktop
```

3. Log out and log back in (or reboot the VM).

4. After login, the three Chrome windows should appear automatically, each
   fullscreen on its respective monitor.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Chrome opens tabs instead of windows | The `--user-data-dir` flag should prevent this. Verify each instance uses a unique dir. |
| Windows don't move to correct monitor | Run `xrandr --query` and update `MONITOR_X` values. |
| Script works manually but not on login | Increase `STARTUP_DELAY` (desktop may not be ready). Check `~/.xsession-errors` for logs. |
| `wmctrl` or `xdotool` not found | Install them: `sudo apt install wmctrl xdotool` |
| On Wayland, tools don't work | Switch to X11 session at the login screen, or use compositor-specific tools. |
| Chrome shows "restore pages" prompt | The `--disable-session-crashed-bubble` flag should suppress this. Also try adding `--disable-restore-session-state`. |

---

## Cleanup (After Testing)

```bash
# Remove autostart entry
rm ~/.config/autostart/open-monitors.desktop

# Remove the script
rm ~/.local/bin/open-monitors.sh

# Remove temporary Chrome profiles
rm -rf /tmp/chrome-monitor-*
```
