## Getting Started
Install these things
1. Python Versions 3.10-3.12
2. OpenCV Version 4.0-4.12
3. React and Node.JS
4. Flask
5. Numpy
6. ROS2 Humble

Navigate into the web gui folder:

```bash
cd umdloop_gui_web
```

Run the development server:

```bash
npm install
npm run dev
```

TEST THE GUI FROM ATHENA CODE:
```bash
#In Terminal 1 Start RosBridge
cd ~/Downloads/athena-code-main
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

#In Terminal 2 Start Athena Code
cd ~/Downloads/athena-code-main
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch simulation bringup.launch.py publish_ground_truth_tf:=true rviz:=true

#In terminal 3 Start Nav Code
cd ~/Downloads/athena-code-main
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 launch athena_planner navigation.launch.py sim:=true

#In Terminal 4 Test Rover moving in a Cirlce
cd ~/Downloads/athena-code-main
source /opt/ros/humble/setup.bash
source install/setup.bash
ros2 topic pub -r 10 /rear_ackermann_controller/reference geometry_msgs/msg/TwistStamped "{twist: {linear: {x: 0.25}, angular: {z: 0.35}}}"

```

## Required ROS Topics For GUI

The GUI does not need the full ROS graph. These are the minimal topics currently required by the web app based on what it actually displays.

### Minimal required set
- `/gps/fix`
- `/localization/odom`
- `/imu/filtered`
- `/joint_states`
- `/heading`
- `/diagnostics`

### What each topic is used for
- `/gps/fix`: rover marker in the map view
- `/localization/odom`: rover speed in the Technician tab
- `/imu/filtered`: tilt and stability display in the Technician tab
- `/joint_states`: wheel velocity, steering orientation, and mobility diagnostics in the Technician tab
- `/heading`: heading readout in the Technician tab
- `/diagnostics`: system health summary and diagnostics detail cards in the Technician tab

### Optional topics
These are useful only if the GUI grows to display them explicitly.
- `/odom/ground_truth`: simulation/debug comparison
- `/dynamic_joint_states`: richer controller telemetry
- `/aruco_pose`: ArUco tracking status
- `/zed/zed_node/left/image_rect_color`: ROS image-driven camera widgets
- `/plan`: live path visualization outside of the current navigation flow

Run the web server:

```bash
python ./server.py
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Field deployment (base station ↔ rover)

- **Base station** runs this GUI and has internet (for map tiles).
- **Rover** has no internet; it runs ROS 2 and Rosbridge.

So that the map shows the rover's location, the GUI connects to the rover over your radio link:

1. On the **rover**: run Rosbridge (e.g. `ros2 launch rosbridge_server rosbridge_websocket_launch.xml`) so it serves WebSocket on the rover's IP (e.g. port 9090).
2. Put rover and base station on the same network over radio (Wi‑Fi bridge, mesh, or modem so the base can reach the rover's IP).
3. On the **base station**, set the Rosbridge URL to the rover's address. Create `umdloop_gui_web/.env.local`:

   ```bash
   NEXT_PUBLIC_ROSBRIDGE_WS_URL=ws://ROVER_IP:9090
   ```

   Replace `ROVER_IP` with the rover's IP on that network (e.g. `192.168.1.100`). Then rebuild/restart the GUI.

The Map view subscribes to `/gps/fix` (NavSatFix) from the rover over that connection and shows the rover as a green marker. Ensure the rover publishes `/gps/fix` (e.g. from the localization stack or GPS driver).

For UMDLOOP-Native
To Build, go to /build

$env:CMAKE_PREFIX_PATH="C:\Qt\6.10.0\msvc2022_64"
cmake ..
cmake --build . --config Release

# Copy Qt DLLs to your exe
cd Release
C:\Qt\6.10.0\msvc2022_64\bin\windeployqt.exe LoopGui.exe

# Run the application
.\LoopGui.exe
