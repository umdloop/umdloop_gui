#include "CameraManager.hpp"
#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdlib>
#include <fstream>
#include <gst/gst.h>
#include <iostream>
#include <map>
#include <thread>
#ifdef __linux__
#  include <climits>
#  include <cstdlib>
#  include <sstream>
#  include <unistd.h>
#endif

using json = nlohmann::json;

struct DiscoveryCandidate {
    int idx = 0;
    std::string displayName;
    std::string devicePath;
    std::string usbPath;
    std::string physicalKey;
    std::vector<CameraMode> modes;
    bool cropLeftHalf = false;
};

static std::string lowerCopy(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return s;
}

static int videoDeviceIndex(const std::string& devPath) {
    const std::string prefix = "/dev/video";
    auto pos = devPath.rfind(prefix);
    if (pos == std::string::npos) return 100000;

    const std::string n = devPath.substr(pos + prefix.size());
    if (n.empty() || !std::all_of(n.begin(), n.end(), [](unsigned char c) { return std::isdigit(c); }))
        return 100000;
    return std::atoi(n.c_str());
}

static bool devicePathExists(const std::string& devPath) {
#ifdef __linux__
    if (devPath.rfind("/dev/", 0) != 0) return true;
    return access(devPath.c_str(), F_OK) == 0;
#else
    (void)devPath;
    return true;
#endif
}

// Returns a stable USB topology string (e.g. "usb:1-1.2") for a v4l2 device
// by resolving its sysfs symlink and extracting the USB port path.
// Returns "" on non-Linux platforms or if the device is not on a USB bus.
static std::string resolveUsbPath(const std::string& devPath) {
#ifdef __linux__
    auto slash = devPath.rfind('/');
    std::string base = (slash == std::string::npos) ? devPath : devPath.substr(slash + 1);

    std::string sysLink = "/sys/class/video4linux/" + base;
    char resolved[PATH_MAX];
    if (!realpath(sysLink.c_str(), resolved)) return "";

    // Sysfs path looks like:
    //   .../usb1/1-1/1-1.2/1-1.2:1.0/video4linux/video0
    // The USB interface component contains ':' and starts with digits (e.g. "1-1.2:1.0").
    // Strip the interface suffix to get the device path ("1-1.2").
    std::istringstream ss{std::string(resolved)};
    std::string component;
    while (std::getline(ss, component, '/')) {
        auto colon = component.find(':');
        if (colon != std::string::npos && std::isdigit(static_cast<unsigned char>(component[0])))
            return "usb:" + component.substr(0, colon);
    }
#endif
    return "";
}

static int extractMaxFps(const GValue* v) {
    if (GST_VALUE_HOLDS_FRACTION(v)) {
        int n = gst_value_get_fraction_numerator(v);
        int d = gst_value_get_fraction_denominator(v);
        return d > 0 ? n / d : 0;
    }
    if (GST_VALUE_HOLDS_LIST(v)) {
        int best = 0;
        guint sz = gst_value_list_get_size(v);
        for (guint i = 0; i < sz; ++i) {
            const GValue* item = gst_value_list_get_value(v, i);
            if (GST_VALUE_HOLDS_FRACTION(item)) {
                int n = gst_value_get_fraction_numerator(item);
                int d = gst_value_get_fraction_denominator(item);
                if (d > 0) best = std::max(best, n / d);
            }
        }
        return best;
    }
    if (GST_VALUE_HOLDS_FRACTION_RANGE(v)) {
        const GValue* hi = gst_value_get_fraction_range_max(v);
        if (hi && GST_VALUE_HOLDS_FRACTION(hi)) {
            int n = gst_value_get_fraction_numerator(hi);
            int d = gst_value_get_fraction_denominator(hi);
            return d > 0 ? n / d : 0;
        }
    }
    return 0;
}

static std::vector<int> extractFpsValues(const GValue* v) {
    std::vector<int> values;
    if (!v) return values;

    auto addFraction = [&](const GValue* item) {
        if (!GST_VALUE_HOLDS_FRACTION(item)) return;
        int n = gst_value_get_fraction_numerator(item);
        int d = gst_value_get_fraction_denominator(item);
        if (d <= 0) return;
        int fps = n / d;
        if (fps > 0) values.push_back(fps);
    };

    if (GST_VALUE_HOLDS_FRACTION(v)) {
        addFraction(v);
    } else if (GST_VALUE_HOLDS_LIST(v)) {
        guint sz = gst_value_list_get_size(v);
        for (guint i = 0; i < sz; ++i)
            addFraction(gst_value_list_get_value(v, i));
    }

    std::sort(values.begin(), values.end());
    values.erase(std::unique(values.begin(), values.end()), values.end());
    return values;
}

static int chooseSupportedFps(int requested, const CameraMode& mode) {
    int target = requested > 0 ? requested : 10;
    if (!mode.fpsValues.empty()) {
        int best = mode.fpsValues.front();
        for (int fps : mode.fpsValues) {
            if (fps <= target) best = fps;
            if (fps >= target) break;
        }
        return std::max(1, best);
    }
    return std::max(1, std::min(target, mode.maxFps));
}

static std::vector<CameraMode> parseCaps(GstCaps* caps) {
    std::vector<CameraMode> modes;
    if (!caps || gst_caps_is_any(caps) || gst_caps_is_empty(caps)) return modes;

    guint n = gst_caps_get_size(caps);
    for (guint i = 0; i < n; ++i) {
        GstStructure* s    = gst_caps_get_structure(caps, i);
        const gchar*  name = gst_structure_get_name(s);

        CameraMode mode;
        if (g_str_equal(name, "image/jpeg")) {
            mode.format = "MJPG";
        } else if (g_str_equal(name, "video/x-raw")) {
            const gchar* fmt = gst_structure_get_string(s, "format");
            if (!fmt) continue;
            mode.format = fmt;
        } else {
            continue;
        }

        if (!gst_structure_get_int(s, "width",  &mode.width))  continue;
        if (!gst_structure_get_int(s, "height", &mode.height)) continue;

        const GValue* fpsVal = gst_structure_get_value(s, "framerate");
        if (!fpsVal) continue;
        mode.maxFps = extractMaxFps(fpsVal);
        if (mode.maxFps <= 0) continue;
        mode.fpsValues = extractFpsValues(fpsVal);

        auto it = std::find_if(modes.begin(), modes.end(), [&](const CameraMode& m) {
            return m.format == mode.format && m.width == mode.width && m.height == mode.height;
        });
        if (it != modes.end()) {
            it->maxFps = std::max(it->maxFps, mode.maxFps);
            it->fpsValues.insert(it->fpsValues.end(), mode.fpsValues.begin(), mode.fpsValues.end());
            std::sort(it->fpsValues.begin(), it->fpsValues.end());
            it->fpsValues.erase(std::unique(it->fpsValues.begin(), it->fpsValues.end()), it->fpsValues.end());
        } else {
            modes.push_back(mode);
        }
    }

    // If the camera has any MJPEG modes, drop all raw formats — prefer MJPEG.
    // If it has no MJPEG modes (e.g. macOS AVF), keep all raw modes so it still works.
    bool hasMjpeg = std::any_of(modes.begin(), modes.end(),
                                [](const CameraMode& m) { return m.format == "MJPG"; });
    if (hasMjpeg) {
        modes.erase(std::remove_if(modes.begin(), modes.end(),
                                   [](const CameraMode& m) { return m.format != "MJPG"; }),
                    modes.end());
    }

    // ascending by pixel count so modes[0] is the lowest resolution
    std::sort(modes.begin(), modes.end(), [](const CameraMode& a, const CameraMode& b) {
        int pa = a.width * a.height, pb = b.width * b.height;
        if (pa != pb) return pa < pb;
        return a.maxFps > b.maxFps; // higher fps first within same resolution
    });

    return modes;
}

static bool containsBusyError(const std::string& message) {
    return message.find("Device or resource busy") != std::string::npos ||
           message.find("Resource busy") != std::string::npos ||
           message.find("resource busy") != std::string::npos ||
           message.find("Failed to allocate required memory") != std::string::npos ||
           message.find("Buffer pool activation failed") != std::string::npos;
}

static bool isZedDevice(const std::string& displayName) {
    std::string name = lowerCopy(displayName);
    return name.find("zed") != std::string::npos;
}

static std::string makePhysicalKey(const std::string& displayName,
                                   const std::string& devicePath,
                                   const std::string& usbPath) {
    if (!usbPath.empty()) return usbPath;
    if (isZedDevice(displayName) && !displayName.empty()) return "name:" + lowerCopy(displayName);
    return devicePath;
}

static bool hasStereoSideBySideMode(const std::vector<CameraMode>& modes) {
    return std::any_of(modes.begin(), modes.end(), [](const CameraMode& mode) {
        return mode.width == 1344 && mode.height == 376;
    });
}

static bool shouldCropLeftHalf(const std::string& displayName,
                               const std::vector<CameraMode>& modes) {
    std::string name = lowerCopy(displayName);
    return isZedDevice(displayName) ||
           name.find("stereo") != std::string::npos ||
           hasStereoSideBySideMode(modes);
}

static bool looksLikeMetadataNode(const DiscoveryCandidate& c) {
    std::string name = lowerCopy(c.displayName);
    return name.find("metadata") != std::string::npos ||
           name.find("meta") != std::string::npos ||
           c.modes.empty();
}

static bool isBetterRepresentative(const DiscoveryCandidate& candidate,
                                   const DiscoveryCandidate& current) {
    const bool candidateZed = isZedDevice(candidate.displayName);
    const bool currentZed = isZedDevice(current.displayName);

    if (candidateZed || currentZed) {
        std::string candidateName = lowerCopy(candidate.displayName);
        std::string currentName = lowerCopy(current.displayName);
        const bool candidateLeft = candidateName.find("left") != std::string::npos;
        const bool currentLeft = currentName.find("left") != std::string::npos;
        if (candidateLeft != currentLeft) return candidateLeft;

        const bool candidateRight = candidateName.find("right") != std::string::npos;
        const bool currentRight = currentName.find("right") != std::string::npos;
        if (candidateRight != currentRight) return !candidateRight;
    }

    int candidateIndex = videoDeviceIndex(candidate.devicePath);
    int currentIndex = videoDeviceIndex(current.devicePath);
    if (candidateIndex != currentIndex) return candidateIndex < currentIndex;

    return candidate.idx < current.idx;
}

static void validateConfigMode(const std::string& id,
                               CameraConfig& cfg,
                               const std::vector<CameraMode>& modes) {
    if (modes.empty()) return;

    auto exact = std::find_if(modes.begin(), modes.end(), [&](const CameraMode& mode) {
        return mode.format == cfg.format &&
               mode.width == cfg.width &&
               mode.height == cfg.height;
    });

    if (exact == modes.end()) {
        const CameraMode& fallback = modes.front();
        std::cerr << "camera config mode unsupported for " << id
                  << ": " << cfg.format << " " << cfg.width << "x" << cfg.height
                  << " on " << cfg.devicePath
                  << "; using " << fallback.format << " "
                  << fallback.width << "x" << fallback.height
                  << " instead" << std::endl;
        cfg.format = fallback.format;
        cfg.width = fallback.width;
        cfg.height = fallback.height;
        cfg.fps = chooseSupportedFps(std::min(cfg.fps > 0 ? cfg.fps : 10, 10), fallback);
        return;
    }

    int supportedFps = chooseSupportedFps(cfg.fps, *exact);
    if (cfg.fps != supportedFps) {
        int oldFps = cfg.fps;
        cfg.fps = supportedFps;
        std::cerr << "camera config fps adjusted for " << id
                  << ": " << oldFps << " -> " << cfg.fps
                  << " on " << cfg.devicePath << std::endl;
    }
}

static void logConfigConflicts(const std::map<std::string, CameraConfig>& configs) {
    std::map<std::string, std::vector<std::string>> byLiveKey;

    for (const auto& [id, cfg] : configs) {
        std::string key;
        if (!cfg.usbPath.empty()) {
            key = cfg.usbPath;
        } else if (!cfg.devicePath.empty()) {
            key = cfg.devicePath;
        }

        if (!key.empty())
            byLiveKey[key].push_back(id);
    }

    for (const auto& [key, ids] : byLiveKey) {
        if (ids.size() < 2) continue;

        std::cerr << "camera config conflict: ";
        for (size_t i = 0; i < ids.size(); ++i) {
            if (i) std::cerr << ", ";
            std::cerr << ids[i];
        }
        std::cerr << " all map to " << key
                  << "; only one pipeline can use a physical camera at a time"
                  << std::endl;
    }
}

std::string CameraManager::pipelineKey(int clientId, const std::string& id) {
    return std::to_string(clientId) + ":" + id;
}

static int clientIdFromPipelineKey(const std::string& key) {
    auto pos = key.find(':');
    if (pos == std::string::npos) return 0;
    return std::atoi(key.substr(0, pos).c_str());
}

static std::string cameraIdFromPipelineKey(const std::string& key) {
    auto pos = key.find(':');
    if (pos == std::string::npos) return key;
    return key.substr(pos + 1);
}

static std::string physicalCameraKey(const CameraConfig& cfg) {
    return cfg.usbPath.empty() ? cfg.devicePath : cfg.usbPath;
}


void CameraManager::loadConfigs(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) return;

    try {
        auto j = json::parse(f);
        for (auto& [id, obj] : j["cameras"].items()) {
            CameraConfig cfg;
            cfg.devicePath = obj["devicePath"];
            cfg.usbPath    = obj.value("usbPath",  "");
            cfg.name       = obj.value("name",     "");
            cfg.role       = obj.value("role",     "");
            cfg.format     = obj.value("format",   "");
            cfg.width      = obj.value("width",    1280);
            cfg.height     = obj.value("height",   720);
            cfg.fps        = obj.value("fps",      30);
            cfg.quality    = obj.value("quality",  "medium");
            cfg.exposure   = obj.value("exposure", -1);
            cfg.cropLeftHalf = obj.value("cropLeftHalf", false);
            configs_[id]   = cfg;
        }
    } catch (const std::exception& e) {
        std::cerr << "loadConfigs: " << e.what() << std::endl;
    }
}

void CameraManager::saveConfigs(const std::string& path) const {
    json cameras = json::object();
    for (const auto& [id, cfg] : configs_) {
        cameras[id] = {
            {"devicePath", cfg.devicePath},
            {"usbPath",    cfg.usbPath},
            {"name",       cfg.name},
            {"role",       cfg.role},
            {"format",     cfg.format},
            {"width",      cfg.width},
            {"height",     cfg.height},
            {"fps",        cfg.fps},
            {"quality",    cfg.quality},
            {"exposure",   cfg.exposure},
            {"cropLeftHalf", cfg.cropLeftHalf},
        };
    }
    std::ofstream f(path);
    f << json{{"cameras", cameras}}.dump(2) << "\n";
}

void CameraManager::discoverCameras() {
    int nextId = 0;
    activeCameraIds_.clear();
    capabilities_.clear();

    // Find an existing config for a discovered device.
    // Prefers usbPath match (stable across reboots) over devicePath match (fallback
    // for old configs that predate usbPath or for non-USB devices).
    auto findExisting = [&](const std::string& devPath, const std::string& usbPath)
        -> std::map<std::string, CameraConfig>::iterator {
        if (!usbPath.empty()) {
            for (auto it = configs_.begin(); it != configs_.end(); ++it)
                if (it->second.usbPath == usbPath) return it;
        }
        for (auto it = configs_.begin(); it != configs_.end(); ++it)
            if (it->second.usbPath.empty() && it->second.devicePath == devPath) return it;
        return configs_.end();
    };

    auto generateName = [&]() {
        std::string name;
        do { name = "camera_" + std::to_string(nextId++); }
        while (configs_.count(name));
        return name;
    };

    GstDeviceMonitor* monitor = gst_device_monitor_new();
    gst_device_monitor_add_filter(monitor, "Video/Source", nullptr);

    if (!gst_device_monitor_start(monitor)) {
        std::cerr << "discoverCameras: GstDeviceMonitor failed to start" << std::endl;
        gst_object_unref(monitor);
        return;
    }

    GList* devices = gst_device_monitor_get_devices(monitor);
    std::cout << "discoverCameras: found " << g_list_length(devices) << " device(s)" << std::endl;

    gst_device_monitor_stop(monitor);

    std::vector<DiscoveryCandidate> candidates;
    int idx = 0;
    for (GList* l = devices; l; l = l->next, ++idx) {
        GstDevice* device = GST_DEVICE(l->data);

        gchar* displayName = gst_device_get_display_name(device);
        std::string display = displayName ? displayName : "";
        std::cout << "  [" << idx << "] name=\"" << (display.empty() ? "(null)" : display) << "\"" << std::endl;
        g_free(displayName);

        std::string devicePath;

        GstStructure* props = gst_device_get_properties(device);
        if (props) {
            const gchar* p = gst_structure_get_string(props, "api.v4l2.path");
            if (!p) p = gst_structure_get_string(props, "device.path");
            if (p) devicePath = p;
            gst_structure_free(props);
        }

        if (devicePath.empty()) {
            GstElement* elem = gst_device_create_element(device, nullptr);
            if (elem) {
                gint devIdx = -1;
                g_object_get(elem, "device-index", &devIdx, nullptr);
                devicePath = std::to_string(devIdx >= 0 ? devIdx : idx);
                gst_element_set_state(elem, GST_STATE_NULL);
                gst_object_unref(elem);
            } else {
                devicePath = std::to_string(idx);
            }
        }

        if (devicePath.empty()) {
            std::cerr << "    -> path=(unknown) key=(unknown) skipped: could not determine device path" << std::endl;
            continue;
        }

        std::string usbPath = resolveUsbPath(devicePath);

        GstCaps* caps = gst_device_get_caps(device);
        std::vector<CameraMode> modes = parseCaps(caps);
        if (caps) gst_caps_unref(caps);

        DiscoveryCandidate candidate;
        candidate.idx = idx;
        candidate.displayName = display;
        candidate.devicePath = devicePath;
        candidate.usbPath = usbPath;
        candidate.physicalKey = makePhysicalKey(display, devicePath, usbPath);
        candidate.modes = std::move(modes);
        candidate.cropLeftHalf = shouldCropLeftHalf(candidate.displayName, candidate.modes);

        std::cout << "    -> path=" << candidate.devicePath
                  << " key=" << candidate.physicalKey
                  << " modes=" << candidate.modes.size()
                  << (candidate.cropLeftHalf ? " crop=left-half" : "")
                  << std::endl;

        if (looksLikeMetadataNode(candidate)) {
            std::cout << "    -> skipped: no usable capture modes"
                      << (isZedDevice(candidate.displayName) ? " (ZED metadata/non-capture node)" : "")
                      << std::endl;
            continue;
        }

        candidates.push_back(std::move(candidate));
    }

    std::map<std::string, DiscoveryCandidate> accepted;
    for (const auto& candidate : candidates) {
        auto [it, inserted] = accepted.emplace(candidate.physicalKey, candidate);
        if (!inserted && isBetterRepresentative(candidate, it->second)) {
            std::cout << "  duplicate physical camera key=" << candidate.physicalKey
                      << ": replacing " << it->second.devicePath
                      << " with " << candidate.devicePath;
            if (isZedDevice(candidate.displayName))
                std::cout << " (ZED left/preferred view)";
            std::cout << std::endl;
            it->second = candidate;
        } else if (!inserted) {
            std::cout << "  duplicate physical camera key=" << candidate.physicalKey
                      << ": skipped path=" << candidate.devicePath
                      << " name=\"" << candidate.displayName << "\"";
            if (isZedDevice(candidate.displayName))
                std::cout << " (ZED non-left/duplicate view)";
            std::cout << std::endl;
        }
    }

    for (const auto& [key, candidate] : accepted) {
        capabilities_[candidate.devicePath] = candidate.modes;

        auto it = findExisting(candidate.devicePath, candidate.usbPath);
        if (it != configs_.end()) {
            if (it->second.devicePath != candidate.devicePath) {
                std::cout << "  accepted name=\"" << candidate.displayName
                          << "\" path=" << candidate.devicePath
                          << " key=" << candidate.physicalKey
                          << " as \"" << it->first << "\" (path updated from "
                          << it->second.devicePath << ")" << std::endl;
                it->second.devicePath = candidate.devicePath;
            } else {
                std::cout << "  accepted name=\"" << candidate.displayName
                          << "\" path=" << candidate.devicePath
                          << " key=" << candidate.physicalKey
                          << " as \"" << it->first << "\"" << std::endl;
            }
            if (it->second.usbPath.empty() && !candidate.usbPath.empty())
                it->second.usbPath = candidate.usbPath;
            it->second.cropLeftHalf = candidate.cropLeftHalf;
            validateConfigMode(it->first, it->second, candidate.modes);
            activeCameraIds_.insert(it->first);
            continue;
        }

        std::string name = generateName();
        auto& cfg = configs_[name];
        cfg.devicePath = candidate.devicePath;
        cfg.usbPath = candidate.usbPath;
        cfg.quality = "low";
        cfg.fps = 10;
        cfg.cropLeftHalf = candidate.cropLeftHalf;

        const auto& modes = candidate.modes;
        if (!modes.empty()) {
            cfg.format = modes[0].format;
            cfg.width = modes[0].width;
            cfg.height = modes[0].height;
            cfg.fps = chooseSupportedFps(cfg.fps, modes[0]);
        }

        activeCameraIds_.insert(name);
        std::cout << "  accepted name=\"" << candidate.displayName
                  << "\" path=" << candidate.devicePath
                  << " key=" << candidate.physicalKey
                  << " registered as \"" << name << "\""
                  << " default=" << cfg.format << " "
                  << cfg.width << "x" << cfg.height
                  << "@" << cfg.fps << " quality=" << cfg.quality
                  << (cfg.cropLeftHalf ? " crop=left-half" : "")
                  << std::endl;
    }

    for (auto it = pipelines_.begin(); it != pipelines_.end(); ) {
        if (activeCameraIds_.count(cameraIdFromPipelineKey(it->first))) {
            ++it;
            continue;
        }
        std::cerr << "discovery: disabling stale active pipeline \"" << it->first
                  << "\" because its device is no longer accepted" << std::endl;
        it = pipelines_.erase(it);
    }

    for (const auto& [id, cfg] : configs_) {
        if (activeCameraIds_.count(id)) continue;
        std::cout << "  persisted config \"" << id << "\" path=" << cfg.devicePath
                  << " usb=" << (cfg.usbPath.empty() ? "(none)" : cfg.usbPath)
                  << " not sent to GUI: device not currently discovered/accepted"
                  << std::endl;
    }

    g_list_free_full(devices, gst_object_unref);
    gst_object_unref(monitor);
    logConfigConflicts(configs_);
}

bool CameraManager::isEnabled(const std::string& id) const {
    return viewerCount(id) > 0;
}

bool CameraManager::isEnabledForClient(int clientId, const std::string& id) const {
    return pipelines_.count(pipelineKey(clientId, id)) > 0;
}

int CameraManager::viewerCount(const std::string& id) const {
    int count = 0;
    for (const auto& [key, _] : pipelines_) {
        if (cameraIdFromPipelineKey(key) == id)
            ++count;
    }
    return count;
}

void CameraManager::enableCamera(int clientId, const std::string& id) {
    auto it = configs_.find(id);
    if (it == configs_.end()) {
        std::cerr << "enableCamera: unknown id: " << id << " client=" << clientId << std::endl;
        return;
    }
    if (!activeCameraIds_.count(id)) {
        std::cerr << "enableCamera: refusing inactive/stale id: " << id
                  << " client=" << clientId << std::endl;
        return;
    }

    if (!devicePathExists(it->second.devicePath)) {
        std::cerr << "enableCamera: device path missing for client=" << clientId
                  << " camera=" << id
                  << " path=" << it->second.devicePath
                  << "; rediscovering cameras" << std::endl;
        discoverCameras();

        it = configs_.find(id);
        if (it == configs_.end() || !activeCameraIds_.count(id) ||
            !devicePathExists(it->second.devicePath)) {
            std::cerr << "enableCamera: refusing camera after rediscovery for client="
                      << clientId << " camera=" << id
                      << " because its device is not currently present" << std::endl;
            return;
        }

        std::cerr << "enableCamera: rediscovery mapped client=" << clientId
                  << " camera=" << id
                  << " to path=" << it->second.devicePath << std::endl;
    }

    const std::string key = pipelineKey(clientId, id);
    if (pipelines_.count(key)) disableCamera(clientId, id);

    const std::string targetPhysicalKey = physicalCameraKey(it->second);
    if (!targetPhysicalKey.empty()) {
        for (auto active = pipelines_.begin(); active != pipelines_.end(); ) {
            const std::string activeCameraId = cameraIdFromPipelineKey(active->first);
            auto activeCfg = configs_.find(activeCameraId);
            if (activeCfg == configs_.end() ||
                physicalCameraKey(activeCfg->second) != targetPhysicalKey) {
                ++active;
                continue;
            }

            std::cerr << "enableCamera: closing existing pipeline \""
                      << active->first << "\" for physical camera "
                      << targetPhysicalKey << " before starting client="
                      << clientId << " camera=" << id << std::endl;
            active = pipelines_.erase(active);
        }
    }

    std::string lastError;
    constexpr int kMaxAttempts = 3;
    for (int attempt = 1; attempt <= kMaxAttempts; ++attempt) {
        auto pipeline = std::make_unique<CameraPipeline>(it->second, stunServer_);

        if (onOffer_) {
            pipeline->setOnOfferCreatedCallback([this, clientId, id](const std::string& sdp) {
                std::cout << "Routing offer: client=" << clientId << " camera=" << id << std::endl;
                onOffer_(clientId, id, sdp);
            });
        }
        if (onIce_) {
            pipeline->setOnIceCandidateCallback([this, clientId, id](const std::string& candidate, int mline) {
                std::cout << "Routing ICE: client=" << clientId << " camera=" << id << std::endl;
                onIce_(clientId, id, candidate, mline);
            });
        }
        pipeline->setOnErrorCallback([clientId, id](const std::string& message) {
            std::cerr << "Pipeline error for client=" << clientId
                      << " camera=" << id << ": " << message << std::endl;
        });

        if (pipeline->start()) {
            pipelines_[key] = std::move(pipeline);
            std::cout << "Camera enabled: client=" << clientId
                      << " camera=" << id
                      << " viewers=" << viewerCount(id) << std::endl;
            return;
        }

        lastError = pipeline->getLastError();
        if (attempt < kMaxAttempts && containsBusyError(lastError)) {
            std::cerr << "Retrying camera " << id << " for client " << clientId
                      << " after busy/allocation error"
                      << " (attempt " << (attempt + 1) << "/" << kMaxAttempts << ")"
                      << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(350));
            continue;
        }

        break;
    }

    std::cerr << "Failed to start pipeline for client=" << clientId << " camera=" << id;
    if (!lastError.empty()) std::cerr << " (" << lastError << ")";
    std::cerr << std::endl;
}

void CameraManager::disableCamera(int clientId, const std::string& id) {
    pipelines_.erase(pipelineKey(clientId, id));
    std::cout << "Camera disabled: client=" << clientId
              << " camera=" << id
              << " viewers=" << viewerCount(id) << std::endl;
}

void CameraManager::disconnectClient(int clientId) {
    for (auto it = pipelines_.begin(); it != pipelines_.end(); ) {
        if (clientIdFromPipelineKey(it->first) == clientId) {
            std::cout << "Removing pipeline for disconnected client=" << clientId
                      << " camera=" << cameraIdFromPipelineKey(it->first) << std::endl;
            it = pipelines_.erase(it);
        } else {
            ++it;
        }
    }
}

bool CameraManager::renameCamera(const std::string& id, const std::string& newName) {
    if (id == newName || id.empty() || newName.empty()) return false;
    if (!configs_.count(id))     return false;
    if (configs_.count(newName)) return false;

    std::vector<int> enabledClients;
    for (const auto& [key, _] : pipelines_) {
        if (cameraIdFromPipelineKey(key) == id)
            enabledClients.push_back(clientIdFromPipelineKey(key));
    }
    for (int clientId : enabledClients)
        disableCamera(clientId, id);

    configs_[newName] = configs_[id];
    configs_.erase(id);
    if (activeCameraIds_.erase(id))
        activeCameraIds_.insert(newName);

    for (int clientId : enabledClients)
        enableCamera(clientId, newName);
    return true;
}

bool CameraManager::updateConfig(const std::string& id, const CameraConfig& config) {
    if (!configs_.count(id)) return false;
    std::vector<int> enabledClients;
    for (const auto& [key, _] : pipelines_) {
        if (cameraIdFromPipelineKey(key) == id)
            enabledClients.push_back(clientIdFromPipelineKey(key));
    }
    configs_[id] = config;
    for (int clientId : enabledClients) {
        disableCamera(clientId, id);
        enableCamera(clientId, id);
    }
    return true;
}

bool CameraManager::applyConfigPatch(const std::string& id, const json& patch) {
    auto it = configs_.find(id);
    if (it == configs_.end()) return false;
    CameraConfig& cfg = it->second;
    bool pipelineChange = false;
    if (patch.contains("format"))   { cfg.format   = patch["format"].get<std::string>(); pipelineChange = true; }
    if (patch.contains("width"))    { cfg.width    = patch["width"];                     pipelineChange = true; }
    if (patch.contains("height"))   { cfg.height   = patch["height"];                    pipelineChange = true; }
    if (patch.contains("fps")) {
        cfg.fps = patch["fps"];
        auto capIt = capabilities_.find(cfg.devicePath);
        if (capIt != capabilities_.end()) {
            for (const auto& mode : capIt->second) {
                if (mode.format == cfg.format && mode.width == cfg.width && mode.height == cfg.height) {
                    cfg.fps = chooseSupportedFps(cfg.fps, mode);
                    break;
                }
            }
        }
        pipelineChange = true;
    }
    if (patch.contains("quality"))  { cfg.quality  = patch["quality"].get<std::string>(); pipelineChange = true; }
    if (patch.contains("exposure")) { cfg.exposure = patch["exposure"];                    pipelineChange = true; }
    if (patch.contains("role"))       cfg.role     = patch["role"].get<std::string>();
    if (pipelineChange && isEnabled(id)) {
        std::vector<int> enabledClients;
        for (const auto& [key, _] : pipelines_) {
            if (cameraIdFromPipelineKey(key) == id)
                enabledClients.push_back(clientIdFromPipelineKey(key));
        }
        for (int clientId : enabledClients) {
            disableCamera(clientId, id);
            enableCamera(clientId, id);
        }
    }
    return true;
}

void CameraManager::setRemoteAnswer(int clientId, const std::string& id, const std::string& sdp) {
    std::cout << "Routing answer: client=" << clientId << " camera=" << id << std::endl;
    auto it = pipelines_.find(pipelineKey(clientId, id));
    if (it != pipelines_.end()) it->second->setRemoteAnswer(sdp);
}

void CameraManager::addIceCandidate(int clientId, const std::string& id, const std::string& candidate, int sdpMLineIndex) {
    std::cout << "Routing remote ICE: client=" << clientId << " camera=" << id << std::endl;
    auto it = pipelines_.find(pipelineKey(clientId, id));
    if (it != pipelines_.end()) it->second->addIceCandidate(candidate, sdpMLineIndex);
}

std::string CameraManager::buildStateJson(int clientId) const {
    json cameras = json::array();
    for (const auto& [id, cfg] : configs_) {
        if (!activeCameraIds_.count(id)) continue;

        json caps = json::array();
        auto capIt = capabilities_.find(cfg.devicePath);
        if (capIt != capabilities_.end()) {
            for (const auto& mode : capIt->second) {
                caps.push_back({
                    {"format", mode.format},
                    {"width",  mode.width},
                    {"height", mode.height},
                    {"maxFps", mode.maxFps},
                });
            }
        }
        cameras.push_back({
            {"id",           id},
            {"name",         cfg.name.empty() ? id : cfg.name},
            {"role",         cfg.role},
            {"devicePath",   cfg.devicePath},
            {"usbPath",      cfg.usbPath},
            {"format",       cfg.format},
            {"enabled",      clientId >= 0 ? isEnabledForClient(clientId, id) : isEnabled(id)},
            {"viewerCount",  viewerCount(id)},
            {"width",        cfg.width},
            {"height",       cfg.height},
            {"fps",          cfg.fps},
            {"quality",      cfg.quality},
            {"bitrate",      cfg.computeBitrate()},
            {"exposure",     cfg.exposure},
            {"cropLeftHalf",  cfg.cropLeftHalf},
            {"capabilities", caps},
        });
    }
    return json{{"type", "state"}, {"cameras", cameras}}.dump();
}

PipelineStats CameraManager::getCameraStats(int clientId, const std::string& id) {
    auto it = pipelines_.find(pipelineKey(clientId, id));
    if (it != pipelines_.end()) return it->second->getStats();
    return {};
}

std::vector<std::pair<int, std::string>> CameraManager::getActiveViews() const {
    std::vector<std::pair<int, std::string>> views;
    for (const auto& [key, _] : pipelines_)
        views.push_back({clientIdFromPipelineKey(key), cameraIdFromPipelineKey(key)});
    return views;
}

bool CameraManager::reapFailedPipelines() {
    bool changed = false;
    for (auto it = pipelines_.begin(); it != pipelines_.end(); ) {
        if (!it->second->hasFailed()) {
            ++it;
            continue;
        }

        int clientId = clientIdFromPipelineKey(it->first);
        std::string cameraId = cameraIdFromPipelineKey(it->first);
        std::cerr << "Camera disabled after pipeline failure: client="
                  << clientId << " camera=" << cameraId;
        const std::string err = it->second->getLastError();
        if (!err.empty()) std::cerr << " (" << err << ")";
        std::cerr << std::endl;

        it = pipelines_.erase(it);
        changed = true;
    }
    return changed;
}
