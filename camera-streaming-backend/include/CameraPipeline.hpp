#pragma once

#include <gst/gst.h>
#include <gst/webrtc/webrtc.h>
#include <atomic>
#include <chrono>
#include <functional>
#include <mutex>
#include <string>

#include "CameraConfig.hpp"

struct PipelineStats {
    double fps     = 0.0;
    int    bitrate = 0;
};

class CameraPipeline {
public:
    using OnIceCandidateCallback = std::function<void(const std::string& candidate, int sdpMLineIndex)>;
    using OnOfferCreatedCallback = std::function<void(const std::string& sdp)>;
    using OnErrorCallback = std::function<void(const std::string& message)>;

    CameraPipeline(const CameraConfig& config, std::string stunServer = {});
    ~CameraPipeline();

    bool start();
    void stop();

    void setRemoteAnswer(const std::string& sdp);
    void addIceCandidate(const std::string& candidate, int sdpMLineIndex);

    void setOnIceCandidateCallback(OnIceCandidateCallback cb) { onIceCandidate_ = cb; }
    void setOnOfferCreatedCallback(OnOfferCreatedCallback cb) { onOfferCreated_ = cb; }
    void setOnErrorCallback(OnErrorCallback cb) { onError_ = cb; }

    bool hasFailed() const { return failed_.load(); }
    std::string getLastError() const;

    PipelineStats getStats();

    static void onOfferCreated(GstPromise* promise, gpointer user_data);

private:
    CameraConfig config_;
    std::string  stunServer_;
    GstElement* pipeline_  = nullptr;
    GstElement* webrtcbin_ = nullptr;
    guint       busWatchId_ = 0;
    guint       offerSourceId_ = 0;

    std::atomic<int>       frameCount_{0};
    std::atomic<long long> byteCount_{0};
    std::atomic<long long> lastStatsMs_{0};
    std::atomic<bool>      offerScheduled_{false};
    std::atomic<bool>      failed_{false};
    std::string            lastError_;
    mutable std::mutex     errorMutex_;

    OnIceCandidateCallback onIceCandidate_;
    OnOfferCreatedCallback onOfferCreated_;
    OnErrorCallback onError_;

    static GstPadProbeReturn statsProbe(GstPad* pad, GstPadProbeInfo* info, gpointer user_data);
    static gboolean doCreateOffer(gpointer data);
    static gboolean onBusMessage(GstBus* bus, GstMessage* message, gpointer user_data);
    static void onNegotiationNeeded(GstElement* webrtcbin, gpointer user_data);
    static void onIceCandidate(GstElement* webrtcbin, guint mlineindex, gchar* candidate, gpointer user_data);
};
