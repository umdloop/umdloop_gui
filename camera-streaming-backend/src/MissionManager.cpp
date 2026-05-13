#include "MissionManager.hpp"
#include <ctime>
#include <fstream>
#include <iostream>

using json = nlohmann::json;

static std::string currentUtcTimestamp() {
    std::time_t t = std::time(nullptr);
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&t));
    return buf;
}

static CameraConfig configFromJson(const json& obj) {
    CameraConfig cfg;
    cfg.devicePath = obj.value("devicePath", "");
    cfg.name       = obj.value("name",       "");
    cfg.format     = obj.value("format",     "MJPG");
    cfg.width      = obj.value("width",      640);
    cfg.height     = obj.value("height",     480);
    cfg.fps        = obj.value("fps",        30);
    cfg.quality    = obj.value("quality",   "medium");
    cfg.exposure   = obj.value("exposure",   -1);
    return cfg;
}

void MissionManager::load(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) return;
    try {
        auto j = json::parse(f);
        activeMissionId_ = j.value("activeMission", "");
        for (auto& [id, obj] : j["missions"].items()) {
            MissionConfig m;
            m.id        = id;
            m.name      = obj.value("name",      id);
            m.createdAt = obj.value("createdAt", "");
            if (obj.contains("cameras")) {
                for (auto& [camId, camObj] : obj["cameras"].items())
                    m.cameras[camId] = configFromJson(camObj);
            }
            missions_[id] = std::move(m);
        }
    } catch (const std::exception& e) {
        std::cerr << "MissionManager::load: " << e.what() << std::endl;
    }
}

void MissionManager::save(const std::string& path) const {
    json missionsObj = json::object();
    for (const auto& [id, m] : missions_) {
        json camsObj = json::object();
        for (const auto& [camId, cfg] : m.cameras) {
            camsObj[camId] = {
                {"devicePath", cfg.devicePath},
                {"name",       cfg.name},
                {"format",     cfg.format},
                {"width",      cfg.width},
                {"height",     cfg.height},
                {"fps",        cfg.fps},
                {"quality",    cfg.quality},
                {"exposure",   cfg.exposure},
            };
        }
        missionsObj[id] = {
            {"name",      m.name},
            {"createdAt", m.createdAt},
            {"cameras",   camsObj},
        };
    }
    std::ofstream f(path);
    f << json{{"activeMission", activeMissionId_}, {"missions", missionsObj}}.dump(2) << "\n";
}

std::vector<MissionConfig> MissionManager::listMissions() const {
    std::vector<MissionConfig> result;
    result.reserve(missions_.size());
    for (const auto& [_, m] : missions_) result.push_back(m);
    return result;
}

const MissionConfig* MissionManager::getMission(const std::string& id) const {
    auto it = missions_.find(id);
    return it != missions_.end() ? &it->second : nullptr;
}

void MissionManager::saveMission(const std::string& id,
                                  const std::string& name,
                                  const std::map<std::string, CameraConfig>& cameras) {
    bool isNew = missions_.find(id) == missions_.end();
    MissionConfig& m = missions_[id];
    m.id      = id;
    m.name    = name;
    if (isNew) m.createdAt = currentUtcTimestamp();
    m.cameras = cameras;
}

bool MissionManager::deleteMission(const std::string& id) {
    if (!missions_.count(id)) return false;
    missions_.erase(id);
    if (activeMissionId_ == id) activeMissionId_.clear();
    return true;
}

void MissionManager::setActiveMission(const std::string& id) {
    activeMissionId_ = id;
}

json MissionManager::buildMissionsStateJson() const {
    json arr = json::array();
    for (const auto& [id, m] : missions_) {
        arr.push_back({
            {"id",        m.id},
            {"name",      m.name},
            {"createdAt", m.createdAt},
        });
    }
    return json{
        {"type",          "missions_state"},
        {"activeMission", activeMissionId_},
        {"missions",      arr},
    };
}
