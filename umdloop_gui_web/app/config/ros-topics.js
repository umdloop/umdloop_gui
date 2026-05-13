export const GUI_REQUIRED_TOPICS = {
  gpsFix: {
    name: process.env.NEXT_PUBLIC_GUI_GPS_TOPIC || "/gps/fix",
    messageType: process.env.NEXT_PUBLIC_GUI_GPS_TYPE || "sensor_msgs/msg/NavSatFix",
  },
  localizationOdom: {
    name: process.env.NEXT_PUBLIC_GUI_ODOM_TOPIC || "/localization/odom",
    messageType: process.env.NEXT_PUBLIC_GUI_ODOM_TYPE || "nav_msgs/msg/Odometry",
  },
  filteredImu: {
    name: process.env.NEXT_PUBLIC_GUI_IMU_TOPIC || "/imu/filtered",
    messageType: process.env.NEXT_PUBLIC_GUI_IMU_TYPE || "sensor_msgs/msg/Imu",
  },
  jointStates: {
    name: process.env.NEXT_PUBLIC_GUI_JOINT_STATES_TOPIC || "/joint_states",
    messageType: process.env.NEXT_PUBLIC_GUI_JOINT_STATES_TYPE || "sensor_msgs/msg/JointState",
  },
  heading: {
    name: process.env.NEXT_PUBLIC_GUI_HEADING_TOPIC || "/heading",
    messageType: process.env.NEXT_PUBLIC_GUI_HEADING_TYPE || "std_msgs/msg/Float64",
  },
  diagnostics: {
    name: process.env.NEXT_PUBLIC_GUI_DIAGNOSTICS_TOPIC || "/diagnostics",
    messageType: process.env.NEXT_PUBLIC_GUI_DIAGNOSTICS_TYPE || "diagnostic_msgs/msg/DiagnosticArray",
  },
};

export const TECHNICIAN_TOPICS = {
  localizationOdom: GUI_REQUIRED_TOPICS.localizationOdom,
  filteredImu: GUI_REQUIRED_TOPICS.filteredImu,
  jointStates: GUI_REQUIRED_TOPICS.jointStates,
  heading: GUI_REQUIRED_TOPICS.heading,
  diagnostics: GUI_REQUIRED_TOPICS.diagnostics,
  motorStatus: {
    name: process.env.NEXT_PUBLIC_GUI_MOTOR_STATUS_TOPIC || "/motor_status_controller/motor_status",
    messageType: process.env.NEXT_PUBLIC_GUI_MOTOR_STATUS_TYPE || "msgs/msg/SystemInfo",
  },
};

export const TECHNICIAN_COMMAND_TOPICS = {
  hardStopTwist: (process.env.NEXT_PUBLIC_TECHNICIAN_HARD_STOP_TOPICS || "/cmd_vel_teleop,/cmd_vel_nav,/cmd_vel_smoothed")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, messageType: "geometry_msgs/msg/Twist" })),
  hardStopStamped: (process.env.NEXT_PUBLIC_TECHNICIAN_HARD_STOP_STAMPED_TOPICS || "/ackermann_steering_controller/reference,/rear_ackermann_controller/reference")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, messageType: "geometry_msgs/msg/TwistStamped" })),
  preemptTeleop: {
    name: process.env.NEXT_PUBLIC_TECHNICIAN_PREEMPT_TOPIC || "/preempt_teleop",
    messageType: process.env.NEXT_PUBLIC_TECHNICIAN_PREEMPT_TYPE || "std_msgs/msg/Empty",
  },
};
