# ros_bridge.py

import math
import threading
import rclpy

from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.qos import QoSProfile, DurabilityPolicy, ReliabilityPolicy

from std_msgs.msg import String
from msgs.action import NavigateToGPS, NavigateToWaypoint
from msgs.msg import WaypointManagerState
from msgs.srv import ClearWaypoints
from nav_msgs.msg import Path
from sensor_msgs.msg import NavSatFix


class RosGpsClient(Node):
    def __init__(self):
        super().__init__("umdloop_gui_ros_bridge")

        self.rover_position = None
        self.plan = None
        self.prev_waypoints = []

        # ── Action clients ────────────────────────────────────────────────────
        self._gps_client = ActionClient(self, NavigateToGPS, "/navigate_to_gps")
        self._wp_client = ActionClient(
            self, NavigateToWaypoint, "/waypoint_manager/navigate_to_waypoint"
        )

        # ── nav_mode publisher ────────────────────────────────────────────────
        nav_mode_qos = QoSProfile(depth=1)
        nav_mode_qos.durability = DurabilityPolicy.TRANSIENT_LOCAL
        nav_mode_qos.reliability = ReliabilityPolicy.RELIABLE
        self._nav_mode_pub = self.create_publisher(String, "/nav_mode", nav_mode_qos)

        # ── Service clients ───────────────────────────────────────────────────
        self._clear_wp_client = self.create_client(
            ClearWaypoints, "/waypoint_manager/clear_waypoints"
        )

        # ── Subscriptions ─────────────────────────────────────────────────────
        gps_qos = QoSProfile(depth=1)
        gps_qos.reliability = ReliabilityPolicy.BEST_EFFORT
        self.create_subscription(NavSatFix, "/gps/fix", self._gps_callback, gps_qos)

        plan_qos = QoSProfile(depth=1)
        plan_qos.durability = DurabilityPolicy.VOLATILE
        plan_qos.reliability = ReliabilityPolicy.RELIABLE
        self.create_subscription(Path, "/plan", self._plan_callback, plan_qos)

        self.create_subscription(
            WaypointManagerState,
            "/waypoint_manager/state",
            self._waypoint_state_callback,
            10,
        )

        self.get_logger().info("RosGpsClient initialized")

    # ── Callbacks (called by the spin thread — no extra spinning needed) ──────

    def _gps_callback(self, msg: NavSatFix):
        if msg.latitude is not None and msg.longitude is not None:
            self.rover_position = {
                "latitude": msg.latitude,
                "longitude": msg.longitude,
            }

    def _plan_callback(self, msg: Path):
        if not msg.poses or self.rover_position is None:
            return
        anchor_x = msg.poses[0].pose.position.x
        anchor_y = msg.poses[0].pose.position.y
        anchor_lat = self.rover_position["latitude"]
        anchor_lon = self.rover_position["longitude"]
        cos_lat = math.cos(math.radians(anchor_lat))
        coords = []
        for pose in msg.poses:
            dx = pose.pose.position.x - anchor_x
            dy = pose.pose.position.y - anchor_y
            coords.append([
                anchor_lon + dx / (111111.0 * cos_lat),
                anchor_lat + dy / 111111.0,
            ])
        self.plan = coords
        self.get_logger().info(f"Received /plan with {len(coords)} poses")

    def _waypoint_state_callback(self, msg: WaypointManagerState):
        self.prev_waypoints = [
            {"id": wp.id, "latitude": wp.latitude, "longitude": wp.longitude}
            for wp in msg.waypoints
        ]

    # ── nav_mode ──────────────────────────────────────────────────────────────

    def publish_nav_mode(self, mode: str):
        msg = String()
        msg.data = mode
        self._nav_mode_pub.publish(msg)
        self.get_logger().info(f"Published /nav_mode = '{mode}'")

    # ── Blocking helpers (Flask thread waits on an Event; spin thread does work) ──

    def _await_action(self, client, goal, timeout_sec):
        """
        Send an action goal and block until result.
        Returns (accepted, success, message).

        Uses add_done_callback so the background spin thread handles all ROS
        callbacks without any spin_until_future_complete conflicts.
        """
        done_event = threading.Event()
        outcome = [False, False, "Unknown error"]

        def on_result(result_future):
            result = result_future.result().result
            outcome[0] = True
            outcome[1] = bool(result.success)
            outcome[2] = result.message
            done_event.set()

        def on_goal(goal_future):
            goal_handle = goal_future.result()
            if not goal_handle.accepted:
                outcome[0] = False
                outcome[1] = False
                outcome[2] = "Goal rejected"
                done_event.set()
                return
            goal_handle.get_result_async().add_done_callback(on_result)

        send_future = client.send_goal_async(goal)
        send_future.add_done_callback(on_goal)

        if not done_event.wait(timeout=timeout_sec):
            return True, False, "Timed out waiting for result"
        return tuple(outcome)

    def send_gps_goal_blocking(self, lat, lon, tol=0.0, timeout_sec=600.0):
        self.get_logger().info(f"Sending GPS goal: lat={lat}, lon={lon}, tol={tol}")
        if not self._gps_client.wait_for_server(timeout_sec=5.0):
            return False, False, "navigate_to_gps action server not available"
        goal = NavigateToGPS.Goal()
        goal.latitude = float(lat)
        goal.longitude = float(lon)
        goal.position_tolerance = float(tol)
        return self._await_action(self._gps_client, goal, timeout_sec)

    def navigate_to_waypoint_blocking(self, waypoint_id: int, timeout_sec=600.0):
        self.get_logger().info(f"Navigating to waypoint id={waypoint_id}")
        if not self._wp_client.wait_for_server(timeout_sec=5.0):
            return False, False, "navigate_to_waypoint action server not available"
        goal = NavigateToWaypoint.Goal()
        goal.waypoint_id = int(waypoint_id)
        return self._await_action(self._wp_client, goal, timeout_sec)

    def clear_waypoints(self):
        if not self._clear_wp_client.wait_for_service(timeout_sec=2.0):
            return False, "clear_waypoints service not available"

        done_event = threading.Event()
        result_holder = [None]

        def on_response(future):
            result_holder[0] = future.result()
            done_event.set()

        self._clear_wp_client.call_async(ClearWaypoints.Request()).add_done_callback(
            on_response
        )

        if not done_event.wait(timeout=5.0):
            return False, "Timed out waiting for clear_waypoints"
        resp = result_holder[0]
        return resp.success, resp.message


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
        with self._lock:
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
            if rclpy.ok():
                rclpy.shutdown()
            self.started = False


ros_context = RosContext()
