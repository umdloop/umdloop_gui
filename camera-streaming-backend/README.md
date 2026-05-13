# camera-streaming-backend

WebRTC camera streaming backend using GStreamer and WebSockets.

## Dependencies

### Linux (Ubuntu/Debian)

```bash
sudo apt install \
    cmake ninja-build pkg-config \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-nice \
    libwebsockets-dev \
    libssl-dev
```
No idea if those are right.

### macOS via brew install

```bash
brew install cmake ninja pkg-config \
    gstreamer \
    libwebsockets \
    openssl
```

## Build

```bash
cmake -B build -G Ninja
cmake --build build
```

## Run

```bash
./build/camera-stream [--ws-port <port>]
```

## Multi-Client WebRTC

The WebSocket server supports multiple browser clients at the same time. Each
connection receives a numeric `client_id` message:

```json
{"type":"client","client_id":1}
```

Existing GUI messages still use `camera_id` / `id` as before. The backend routes
`offer`, `answer`, and ICE by the WebSocket connection that requested the camera,
and includes `client_id` on server-originated `offer`, `ice`, and `stats`
messages for debugging.

Current implementation note: this is the safe first version with one WebRTC
pipeline per `(client_id, camera_id)`. Multiple monitors can view the same
physical camera without stealing signaling from each other, and one monitor
disabling a camera does not stop another monitor's stream. This does increase
capture/encode load compared with a future shared tee/fanout pipeline.

## Verify Camera Discovery

On the Jetson or Linux host with the cameras attached:

```bash
v4l2-ctl --list-devices
./build/camera-stream [--ws-port <port>]
```

During startup, discovery logs each physical device name, `/dev/video*` path,
stable USB key, accepted/skipped status, and skip reason. The GUI receives only
the accepted active cameras in `state.cameras`; stale `cameras.json` entries and
duplicate nodes from the same physical camera are not sent.

For a ZED 2i, only the selected left/preferred capture node should be accepted.
Right-view, metadata, and duplicate nodes should appear as skipped discovery
entries in the backend log.

If a camera fails with `Failed to allocate required memory` from `gstv4l2src`,
the V4L2/USB buffer pool is exhausted before WebRTC starts. On Jetson/Linux,
check the kernel USB memory setting:

```bash
cat /sys/module/usbcore/parameters/usbfs_memory_mb
sudo sh -c 'echo 1000 > /sys/module/usbcore/parameters/usbfs_memory_mb'
lsusb -t
```

If all cameras sit behind one hub/controller, split them across controllers or
powered hubs. Some UVC cameras only advertise `640x360@30`, so the backend
cannot force a lower source FPS for those devices even when outgoing WebRTC
quality is low.
