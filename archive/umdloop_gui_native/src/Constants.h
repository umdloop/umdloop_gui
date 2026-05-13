#ifndef CONSTANTS_H
#define CONSTANTS_H

#include <vector>
#include <string>

// Constants
const std::vector<std::string> MODES = {
    "Simulation", "Cameras", "Sensors", "ROS2 Entities", "Navigation", "Mission"
};

const std::vector<std::string> SUBSYSTEMS = {"Drive", "Arm", "Science"};

#endif // CONSTANTS_H
