# ros_bridge.py

import threading
import rclpy

from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.qos import QoSProfile, DurabilityPolicy, ReliabilityPolicy

from std_msgs.msg import String
from msgs.action import NavigateToGPS
from sensor_msgs.msg import NavSatFix


class RosGpsClient(Node):
    def __init__(self):
        super().__init__("umdloop_gui_ros_bridge")

        # Latest rover GPS fix (None until first message arrives)
        self.rover_position = None

        # Action client (GNSS navigation)
        self._client = ActionClient(
            self,
            NavigateToGPS,
            "/navigate_to_gps"
        )

        # QoS MUST match bt_navigator subscriber
        qos = QoSProfile(depth=1)
        qos.durability = DurabilityPolicy.TRANSIENT_LOCAL
        qos.reliability = ReliabilityPolicy.RELIABLE

        # nav mode publisher
        self._nav_mode_pub = self.create_publisher(
            String,
            "/nav_mode",
            qos
        )

        # GPS fix subscriber — best-effort sensor QoS
        gps_qos = QoSProfile(depth=1)
        gps_qos.reliability = ReliabilityPolicy.BEST_EFFORT
        self.create_subscription(
            NavSatFix,
            "/gps/fix",
            self._gps_callback,
            gps_qos,
        )

        self.get_logger().info("RosGpsClient initialized")

    def _gps_callback(self, msg: NavSatFix):
        if msg.latitude is not None and msg.longitude is not None:
            self.rover_position = {
                "latitude": msg.latitude,
                "longitude": msg.longitude,
            }

    # --------------------------------------------------
    # Publish navigation mode
    # --------------------------------------------------
    def publish_nav_mode(self, mode: str):
        msg = String()
        msg.data = mode
        self._nav_mode_pub.publish(msg)

        self.get_logger().info(f"Published /nav_mode = '{mode}'")

    # --------------------------------------------------
    # Send GNSS goal (blocking)
    # --------------------------------------------------
    def send_gps_goal_blocking(self, lat, lon, tol=0.0, timeout_sec=60.0):
        self.get_logger().info(
            f"Sending GPS goal: lat={lat}, lon={lon}, tol={tol}"
        )

        if not self._client.wait_for_server(timeout_sec=2.0):
            return False, False, "navigate_to_gps action server not available"

        goal = NavigateToGPS.Goal()
        goal.latitude = float(lat)
        goal.longitude = float(lon)
        goal.position_tolerance = float(tol)

        # send goal async
        send_future = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(
            self,
            send_future,
            timeout_sec=5.0
        )

        if not send_future.done():
            return False, False, "Failed to send goal"

        goal_handle = send_future.result()

        if not goal_handle.accepted:
            return False, False, "Goal rejected"

        # wait for result
        result_future = goal_handle.get_result_async()
        rclpy.spin_until_future_complete(
            self,
            result_future,
            timeout_sec=timeout_sec
        )

        if not result_future.done():
            return True, False, "Timed out waiting for result"

        result = result_future.result().result

        return True, bool(result.success), result.message


# ======================================================
# Singleton ROS context manager
# ======================================================

class RosContext:
    def __init__(self):
        self.node = None
        self.thread = None
        self.started = False
        self._lock = threading.Lock()

    def start(self):
        """
        Safe to call multiple times.
        Prevents double rclpy.init() crashes.
        """
        with self._lock:

            if self.started and self.node is not None:
                return

            # init ROS only if needed
            try:
                if not rclpy.ok():
                    rclpy.init(args=None)
            except RuntimeError:
                # already initialized
                pass

            # create node once
            if self.node is None:
                self.node = RosGpsClient()

            # start spin thread once
            if self.thread is None or not self.thread.is_alive():
                self.thread = threading.Thread(
                    target=rclpy.spin,
                    args=(self.node,),
                    daemon=True
                )
                self.thread.start()

            self.started = True
            print("ROS bridge started")

    def shutdown(self):
        with self._lock:

            if self.node is not None:
                self.node.destroy_node()
                self.node = None

            if rclpy.ok():
                rclpy.shutdown()

            self.started = False


# global singleton
ros_context = RosContext()