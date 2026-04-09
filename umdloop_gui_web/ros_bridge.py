# ros_bridge.py

import threading

try:
    import rclpy
    from rclpy.action import ActionClient
    from rclpy.node import Node
    from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
    from std_msgs.msg import String
    from msgs.action import NavigateToGPS

    ROS_IMPORT_ERROR = None
except Exception as exc:
    rclpy = None
    ActionClient = None
    Node = object
    QoSProfile = None
    DurabilityPolicy = None
    ReliabilityPolicy = None
    String = None
    NavigateToGPS = None
    ROS_IMPORT_ERROR = exc


class RosUnavailableError(RuntimeError):
    pass


class RosGpsClient(Node):
    def __init__(self):
        if ROS_IMPORT_ERROR is not None:
            raise RosUnavailableError(
                "ROS bridge dependencies are unavailable. "
                "Make sure your ROS 2 environment is sourced and the custom "
                "`msgs` action package is built."
            ) from ROS_IMPORT_ERROR

        super().__init__("umdloop_gui_ros_bridge")

        self._client = ActionClient(
            self,
            NavigateToGPS,
            "/navigate_to_gps",
        )

        qos = QoSProfile(depth=1)
        qos.durability = DurabilityPolicy.TRANSIENT_LOCAL
        qos.reliability = ReliabilityPolicy.RELIABLE

        self._nav_mode_pub = self.create_publisher(
            String,
            "/nav_mode",
            qos,
        )

        self.get_logger().info("RosGpsClient initialized")

    def publish_nav_mode(self, mode: str):
        msg = String()
        msg.data = mode
        self._nav_mode_pub.publish(msg)
        self.get_logger().info(f"Published /nav_mode = '{mode}'")

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

        send_future = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(
            self,
            send_future,
            timeout_sec=5.0,
        )

        if not send_future.done():
            return False, False, "Failed to send goal"

        goal_handle = send_future.result()

        if not goal_handle.accepted:
            return False, False, "Goal rejected"

        result_future = goal_handle.get_result_async()
        rclpy.spin_until_future_complete(
            self,
            result_future,
            timeout_sec=timeout_sec,
        )

        if not result_future.done():
            return True, False, "Timed out waiting for result"

        result = result_future.result().result
        return True, bool(result.success), result.message


class RosContext:
    def __init__(self):
        self.node = None
        self.thread = None
        self.started = False
        self._lock = threading.Lock()

    def start(self):
        with self._lock:
            if ROS_IMPORT_ERROR is not None:
                raise RosUnavailableError(
                    "ROS bridge dependencies are unavailable. "
                    "Source your ROS 2 workspace that contains `msgs.action.NavigateToGPS` "
                    "before using navigation features."
                ) from ROS_IMPORT_ERROR

            if self.started and self.node is not None:
                return

            try:
                if not rclpy.ok():
                    rclpy.init(args=None)
            except RuntimeError:
                pass

            if self.node is None:
                self.node = RosGpsClient()

            if self.thread is None or not self.thread.is_alive():
                self.thread = threading.Thread(
                    target=rclpy.spin,
                    args=(self.node,),
                    daemon=True,
                )
                self.thread.start()

            self.started = True
            print("ROS bridge started")

    def shutdown(self):
        with self._lock:
            if self.node is not None:
                self.node.destroy_node()
                self.node = None

            if rclpy is not None and rclpy.ok():
                rclpy.shutdown()

            self.started = False


ros_context = RosContext()
