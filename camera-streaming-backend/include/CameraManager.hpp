#pragma once

#include <functional>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "CameraConfig.hpp"
#include "CameraPipeline.hpp"

struct CameraMode {
    std::string format;
    int width;
    int height;
    int maxFps;
    std::vector<int> fpsValues;
};

class CameraManager {
public:
    using OnOfferCallback = std::function<void(int clientId, const std::string& id, const std::string& sdp)>;
    using OnIceCallback   = std::function<void(int clientId, const std::string& id, const std::string& candidate, int sdpMLineIndex)>;

    void setOfferCallback(OnOfferCallback cb)  { onOffer_      = cb; }
    void setIceCallback(OnIceCallback cb)      { onIce_        = cb; }
    void setStunServer(const std::string& url) { stunServer_   = url; }

    void loadConfigs(const std::string& path);
    void saveConfigs(const std::string& path) const;
    void discoverCameras();

    const std::map<std::string, CameraConfig>& getConfigs() const { return configs_; }
    bool isEnabled(const std::string& id) const;
    bool isEnabledForClient(int clientId, const std::string& id) const;
    int viewerCount(const std::string& id) const;

    void enableCamera(int clientId, const std::string& id);
    void disableCamera(int clientId, const std::string& id);
    void disconnectClient(int clientId);
    bool renameCamera(const std::string& id, const std::string& newName);
    bool updateConfig(const std::string& id, const CameraConfig& config);
    bool applyConfigPatch(const std::string& id, const nlohmann::json& patch);

    void setRemoteAnswer(int clientId, const std::string& id, const std::string& sdp);
    void addIceCandidate(int clientId, const std::string& id, const std::string& candidate, int sdpMLineIndex);

    std::string   buildStateJson(int clientId = -1) const;
    PipelineStats getCameraStats(int clientId, const std::string& id);
    std::vector<std::pair<int, std::string>> getActiveViews() const;
    bool reapFailedPipelines();

private:
    static std::string pipelineKey(int clientId, const std::string& id);

    std::map<std::string, CameraConfig>                    configs_;
    std::map<std::string, std::unique_ptr<CameraPipeline>> pipelines_;
    std::map<std::string, std::vector<CameraMode>>         capabilities_;
    std::set<std::string>                                  activeCameraIds_;
    OnOfferCallback onOffer_;
    OnIceCallback   onIce_;
    std::string     stunServer_;
};
