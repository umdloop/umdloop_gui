# ros_bridge.py

import math
import threading
import rclpy

from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.qos import QoSProfile, DurabilityPolicy, ReliabilityPolicy

from std_msgs.msg import String
from msgs.action import NavigateToGPS
from nav_msgs.msg import Path
from sensor_msgs.msg import NavSatFix, CompressedImage
from vision_msgs.msg import Detection2DArray


class RosGpsClient(Node):
    def __init__(self):
        super().__init__("umdloop_gui_ros_bridge")

        # Latest rover GPS fix (None until first message arrives)
        self.rover_position = None

        # Global plan as [[lon, lat], ...] in GPS coords (None until first /plan arrives)
        self.plan = None

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

        # Global plan subscriber — Nav2 planner publishes with VOLATILE durability
        plan_qos = QoSProfile(depth=1)
        plan_qos.durability = DurabilityPolicy.VOLATILE
        plan_qos.reliability = ReliabilityPolicy.RELIABLE
        self.create_subscription(
            Path,
            "/plan",
            self._plan_callback,
            plan_qos,
        )

        # Object detection: latest compressed JPEG + bounding boxes.
        # The streaming endpoint reads these without decoding here, so the
        # callback path stays cheap (one bytes() copy per frame).
        self._frame_cv = threading.Condition()
        self._latest_jpeg = None
        self._latest_detections = []
        self._frame_seq = 0

        cam_qos = QoSProfile(depth=1)
        cam_qos.reliability = ReliabilityPolicy.BEST_EFFORT
        self.create_subscription(
            CompressedImage,
            "/camera/image_raw/compressed",
            self._image_callback,
            cam_qos,
        )

        det_qos = QoSProfile(depth=1)
        det_qos.reliability = ReliabilityPolicy.BEST_EFFORT
        self.create_subscription(
            Detection2DArray,
            "/yolo/detections",
            self._detections_callback,
            det_qos,
        )

        self.get_logger().info("RosGpsClient initialized")

    def _gps_callback(self, msg: NavSatFix):
        if msg.latitude is not None and msg.longitude is not None:
            self.rover_position = {
                "latitude": msg.latitude,
                "longitude": msg.longitude,
            }

    def _plan_callback(self, msg: Path):
        if not msg.poses or self.rover_position is None:
            return

        # Use the first pose (rover's current map position) as the local origin.
        # Distances from that origin are converted to GPS offsets using a flat-earth
        # approximation — accurate to <1 m over competition-scale distances (<500 m).
        anchor_x = msg.poses[0].pose.position.x
        anchor_y = msg.poses[0].pose.position.y
        anchor_lat = self.rover_position["latitude"]
        anchor_lon = self.rover_position["longitude"]
        cos_lat = math.cos(math.radians(anchor_lat))

        gps_coords = []
        for pose in msg.poses:
            dx = pose.pose.position.x - anchor_x
            dy = pose.pose.position.y - anchor_y
            lat = anchor_lat + dy / 111111.0
            lon = anchor_lon + dx / (111111.0 * cos_lat)
            gps_coords.append([lon, lat])

        self.plan = gps_coords
        self.get_logger().info(f"Received /plan with {len(gps_coords)} poses")

    # --------------------------------------------------
    # Object detection stream callbacks
    # --------------------------------------------------
    def _image_callback(self, msg: CompressedImage):
        data = bytes(msg.data)
        with self._frame_cv:
            self._latest_jpeg = data
            self._frame_seq += 1
            self._frame_cv.notify_all()

    def _detections_callback(self, msg: Detection2DArray):
        boxes = []
        for det in msg.detections:
            bbox = det.bbox
            center = bbox.center
            # vision_msgs >= Iron uses center.position.x/.y; older uses center.x/.y
            if hasattr(center, "position"):
                cx, cy = center.position.x, center.position.y
            else:
                cx, cy = center.x, center.y
            sx = bbox.size_x
            sy = bbox.size_y
            x1 = int(cx - sx / 2.0)
            y1 = int(cy - sy / 2.0)
            x2 = int(cx + sx / 2.0)
            y2 = int(cy + sy / 2.0)

            label = ""
            score = 0.0
            if det.results:
                first = det.results[0]
                hyp = getattr(first, "hypothesis", first)
                label = getattr(hyp, "class_id", getattr(hyp, "id", "")) or ""
                score = float(getattr(hyp, "score", 0.0))

            boxes.append((x1, y1, x2, y2, label, score))

        with self._frame_cv:
            self._latest_detections = boxes

    def wait_for_frame(self, last_seq, timeout=1.0):
        with self._frame_cv:
            self._frame_cv.wait_for(
                lambda: self._frame_seq != last_seq,
                timeout=timeout,
            )
            return self._frame_seq, self._latest_jpeg, list(self._latest_detections)

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