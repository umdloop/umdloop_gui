# ros_bridge.py

import threading
import rclpy

from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.qos import QoSProfile, DurabilityPolicy, ReliabilityPolicy, HistoryPolicy, LivelinessPolicy

from std_msgs.msg import String, Float64
from msgs.action import NavigateToGPS

from sensor_msgs.msg import NavSatFix, Imu, JointState
from nav_msgs.msg import Odometry
from diagnostic_msgs.msg import DiagnosticArray

import math


def quat_to_rpy(q):
    x, y, z, w = q.x, q.y, q.z, q.w
    roll  = math.degrees(math.atan2(2*(w*x + y*z), 1 - 2*(x*x + y*y)))
    pitch = math.degrees(math.asin(max(-1.0, min(1.0, 2*(w*y - z*x)))))
    yaw   = math.degrees(math.atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z)))
    return roll, pitch, yaw


def safe_str(v):
    if v is None:
        return None
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)

def safe_float(v):
    try:
        f = float(v)
        return None if (f != f or f == float("inf") or f == float("-inf")) else f
    except Exception:
        return None

class RosGpsClient(Node):
    def __init__(self):
        super().__init__("umdloop_gui_ros_bridge")

       # Action client (GNSS navigation)
        self._client = ActionClient(self, NavigateToGPS, "/navigate_to_gps")

        # QoS MUST match bt_navigator subscriber
        qos_latched = QoSProfile(depth=1)
        qos_latched.durability = DurabilityPolicy.TRANSIENT_LOCAL
        qos_latched.reliability = ReliabilityPolicy.RELIABLE
        

        # nav mode publisher
        self._nav_mode_pub = self.create_publisher(String, "/nav_mode", qos_latched)

        self._state_lock = threading.Lock()
        self._state = {
            "gps":      None,
            "imu":      None,
            "imu_filtered": None,
            "odom":     None,
            "joints":   None,
            "nav_mode": None,
            "heading":  None,
            "diagnostics": [],
        }

        sensor_qos = QoSProfile(
            depth=5,
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE,
        )
        
        reliable_qos = QoSProfile(
            depth=5,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.VOLATILE,
        )

        self._state["nav_mode"] = "GNSS"
        threading.Timer(0.5, lambda: self.publish_nav_mode("GNSS")).start()
                
        self.create_subscription(NavSatFix,       "/gps/fix",           self.gps,      sensor_qos)
        self.create_subscription(Imu,             "/imu",               self.imu,      sensor_qos)
        self.create_subscription(Imu,             "/imu/filtered",      self.imu_filt, sensor_qos)
        self.create_subscription(Odometry,        "/localization/odom", self.odom,     reliable_qos)
        self.create_subscription(JointState,      "/joint_states",      self.joints,   reliable_qos)
        self.create_subscription(String,          "/nav_mode",          self.nav_mode, qos_latched)
        self.create_subscription(Float64,         "/heading",           self.heading,  reliable_qos)
        self.create_subscription(DiagnosticArray, "/diagnostics",       self.diag,     reliable_qos)


        self.get_logger().info("RosGpsClient initialized with rover state subscribers")


    def gps(self, msg):
        with self._state_lock:
            self._state["gps"] = {
                "latitude":  msg.latitude,
                "longitude": msg.longitude,
                "altitude":  msg.altitude,
                "status":    msg.status.status,   
            }

    def imu(self, msg):
        with self._state_lock:
            roll, pitch, yaw = quat_to_rpy(msg.orientation)
            self._state["imu"] = {
                "roll_deg":  roll,
                "pitch_deg": pitch,
                "yaw_deg":   yaw,
                "accel_x":   msg.linear_acceleration.x,
                "accel_y":   msg.linear_acceleration.y,
                "accel_z":   msg.linear_acceleration.z,
                "gyro_x":    msg.angular_velocity.x,
                "gyro_y":    msg.angular_velocity.y,
                "gyro_z":    msg.angular_velocity.z,
            }

    def imu_filt(self, msg):
        with self._state_lock:
            roll, pitch, yaw = quat_to_rpy(msg.orientation)
            self._state["imu_filtered"] = {
                "roll_deg":  roll,
                "pitch_deg": pitch,
                "yaw_deg":   yaw,
                "accel_x":   msg.linear_acceleration.x,
                "accel_y":   msg.linear_acceleration.y,
                "accel_z":   msg.linear_acceleration.z,
            }

    def odom(self, msg):
        with self._state_lock:
            p = msg.pose.pose.position
            roll, pitch, yaw = quat_to_rpy(msg.pose.pose.orientation)
            t = msg.twist.twist
            lin_speed = math.hypot(t.linear.x, t.linear.y)
            self._state["odom"] = {
                "x": safe_float(p.x), "y": safe_float(p.y), "z": safe_float(p.z),
                "roll_deg":  safe_float(roll),
                "pitch_deg": safe_float(pitch),
                "yaw_deg":   safe_float(yaw),
                "linear_x":  safe_float(t.linear.x),
                "linear_y":  safe_float(t.linear.y),
                "linear_speed": safe_float(lin_speed),
                "angular_z": safe_float(t.angular.z),
            }

    def joints(self, msg):
        def safe(arr, i):
            if i >= len(arr):
                return None
            v = arr[i]
            return None if (v != v or v == float("inf") or v == float("-inf")) else v

        with self._state_lock:
            self._state["joints"] = [
                {
                    "name":     safe_str(name),
                    "position": safe(msg.position, i),
                    "velocity": safe(msg.velocity, i),
                    "effort":   safe(msg.effort,   i),
                }
                for i, name in enumerate(msg.name)
            ]

    def nav_mode(self, msg):
        with self._state_lock:
            self._state["nav_mode"] = safe_str(msg.data)

    def heading(self, msg):
        with self._state_lock:
            self._state["heading"] = safe_float(msg.data)

    def diag(self, msg):
        def parse_level(v):
            if isinstance(v, bytes):
                return v[0]   
            if isinstance(v, str):
                return ord(v) 
            return int(v)
    
    
        with self._state_lock:
            self._state["diagnostics"] = [
                {
                    "name":    safe_str(s.name),
                    "level":   parse_level(s.level),
                    "message": safe_str(s.message),
                }
                for s in msg.status
            ]

    # --------------------------------------------------
    # Publish API
    # --------------------------------------------------
    def get_rover_state(self):
        with self._state_lock:
            import copy
            return copy.deepcopy(self._state)

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
        self.get_logger().info(f"Sending GPS goal: lat={lat}, lon={lon}, tol={tol}")

        if not self._client.wait_for_server(timeout_sec=2.0):
            return False, False, "navigate_to_gps action server not available"

        goal = NavigateToGPS.Goal()
        goal.latitude = float(lat)
        goal.longitude = float(lon)
        goal.position_tolerance = float(tol)

        # send goal async
        send_future = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(self, send_future, timeout_sec=5.0)

        if not send_future.done():
            return False, False, "Failed to send goal"

        goal_handle = send_future.result()
        if not goal_handle.accepted:
            return False, False, "Goal rejected"

        # wait for result
        result_future = goal_handle.get_result_async()
        rclpy.spin_until_future_complete(self, result_future, timeout_sec=timeout_sec)

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


# global singleton
ros_context = RosContext()
