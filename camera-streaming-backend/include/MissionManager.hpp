#pragma once

#include <map>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "MissionConfig.hpp"

class MissionManager {
public:
    void load(const std::string& path);
    void save(const std::string& path) const;

    std::vector<MissionConfig> listMissions() const;
    const MissionConfig*       getMission(const std::string& id) const;

    void saveMission(const std::string& id,
                     const std::string& name,
                     const std::map<std::string, CameraConfig>& cameras);
    bool deleteMission(const std::string& id);

    const std::string& activeMissionId() const { return activeMissionId_; }
    void setActiveMission(const std::string& id);

    nlohmann::json buildMissionsStateJson() const;

private:
    std::map<std::string, MissionConfig> missions_;
    std::string                          activeMissionId_;
};
