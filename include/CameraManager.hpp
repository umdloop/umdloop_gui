#pragma once

#include <functional>
#include <map>
#include <memory>
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
};

class CameraManager {
public:
    using OnOfferCallback = std::function<void(const std::string& id, const std::string& sdp)>;
    using OnIceCallback   = std::function<void(const std::string& id, const std::string& candidate, int sdpMLineIndex)>;

    void setOfferCallback(OnOfferCallback cb)  { onOffer_      = cb; }
    void setIceCallback(OnIceCallback cb)      { onIce_        = cb; }
    void setStunServer(const std::string& url) { stunServer_   = url; }

    void loadConfigs(const std::string& path);
    void saveConfigs(const std::string& path) const;
    void discoverCameras();

    const std::map<std::string, CameraConfig>& getConfigs() const { return configs_; }
    bool isEnabled(const std::string& id) const { return pipelines_.count(id) > 0; }

    void enableCamera(const std::string& id);
    void disableCamera(const std::string& id);
    bool renameCamera(const std::string& id, const std::string& newName);
    bool updateConfig(const std::string& id, const CameraConfig& config);
    bool applyConfigPatch(const std::string& id, const nlohmann::json& patch);

    void setRemoteAnswer(const std::string& id, const std::string& sdp);
    void addIceCandidate(const std::string& id, const std::string& candidate, int sdpMLineIndex);

    std::string   buildStateJson() const;
    PipelineStats getCameraStats(const std::string& id);
    bool reapFailedPipelines();

private:
    std::map<std::string, CameraConfig>                    configs_;
    std::map<std::string, std::unique_ptr<CameraPipeline>> pipelines_;
    std::map<std::string, std::vector<CameraMode>>         capabilities_;
    OnOfferCallback onOffer_;
    OnIceCallback   onIce_;
    std::string     stunServer_;
};
