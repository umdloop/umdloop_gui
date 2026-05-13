#pragma once

#include <map>
#include <string>
#include "CameraConfig.hpp"

struct MissionConfig {
    std::string id;
    std::string name;
    std::string createdAt;
    std::map<std::string, CameraConfig> cameras;
};
