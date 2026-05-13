#include "CameraPipeline.hpp"
#include "PlatformDetect.hpp"
#include <chrono>
#include <gst/sdp/gstsdpmessage.h>
#include <iostream>
#include <sstream>
#include <sys/time.h>
#include <thread>

static std::string timestamp() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    struct tm* t = localtime(&tv.tv_sec);
    char buf[16];
    strftime(buf, sizeof(buf), "%H:%M:%S", t);
    return std::string(buf) + "." + std::to_string(tv.tv_usec / 1000);
}

static void removeSourceIfActive(guint& sourceId) {
    if (!sourceId) return;
    GMainContext* context = g_main_context_default();
    if (g_main_context_find_source_by_id(context, sourceId))
        g_source_remove(sourceId);
    sourceId = 0;
}

static bool isV4l2AllocationError(const std::string& message) {
    return message.find("Failed to allocate required memory") != std::string::npos ||
           message.find("Buffer pool activation failed") != std::string::npos ||
           message.find("gstv4l2src_decide_allocation") != std::string::npos;
}


static std::string buildPipelineString(const CameraConfig& cfg, const PlatformSpecifics& specs) {
    const bool isMjpg = (cfg.format == "MJPG");

    std::string src;

    if (specs.source == "videotestsrc") {
        src = "videotestsrc name=src"
              " ! video/x-raw,width=640,height=480,framerate=30/1"
              " ! timeoverlay";
    } else if (specs.source == "v4l2src") {
        src = "v4l2src name=src io-mode=2 do-timestamp=true device=" + cfg.devicePath + " !";
        if (isMjpg) {
            src += " image/jpeg"
                   ",width="  + std::to_string(cfg.width) +
                   ",height=" + std::to_string(cfg.height) +
                   ",framerate=" + std::to_string(cfg.fps) + "/1";
        } else {
            src += " video/x-raw";
            if (!cfg.format.empty()) src += ",format=" + cfg.format;
            src += ",width="  + std::to_string(cfg.width) +
                   ",height=" + std::to_string(cfg.height) +
                   ",framerate=" + std::to_string(cfg.fps) + "/1";
        }
        if (isMjpg) src += " ! jpegdec";
        src += " ! videorate ! video/x-raw,framerate=" + std::to_string(cfg.fps) + "/1";
    } else {
        // Request native resolution from the source, then enforce the fps cap
        // with videorate — avfvideosrc ignores framerate hints it can't satisfy.
        src = "avfvideosrc name=src device-index=" + cfg.devicePath +
              " ! video/x-raw"
              ",width="  + std::to_string(cfg.width) +
              ",height=" + std::to_string(cfg.height) +
              " ! videorate"
              " ! video/x-raw,framerate=" + std::to_string(cfg.fps) + "/1";
    }

    if (cfg.cropLeftHalf && cfg.width > 1) {
        int outputWidth = cfg.width / 2;
        int cropRight = cfg.width - outputWidth;
        src += " ! videocrop right=" + std::to_string(cropRight) +
               " ! video/x-raw,width=" + std::to_string(outputWidth) +
               ",height=" + std::to_string(cfg.height);
    }

    const int bitrate = cfg.computeBitrate();
    std::string enc = specs.encoder;
    if (specs.encoder == "vtenc_h264") {
        enc += " realtime=true bitrate=" + std::to_string(bitrate / 1000);
    } else if (specs.encoder == "nvv4l2h264enc") {
        enc += " insert-sps-pps=true idrinterval=30 bitrate=" + std::to_string(bitrate);
    } else {
        // x264enc expects kbits/sec
        enc += " tune=zerolatency bitrate=" + std::to_string(bitrate / 1000) + " speed-preset=ultrafast key-int-max=30";
    }

    return src +
           " ! videoconvert" +
           " ! " + specs.converter +
           " ! " + enc +
           " ! h264parse name=parse"
           " ! video/x-h264,stream-format=byte-stream,alignment=au"
           " ! rtph264pay name=pay0 config-interval=1 aggregate-mode=zero-latency"
           " ! application/x-rtp,media=video,encoding-name=H264,payload=96,packetization-mode=(string)1"
           " ! webrtcbin name=webrtcbin bundle-policy=max-bundle";
}

// ── Offer creation helpers ────────────────────────────────────────────────────

struct NegotiationCtx {
    GstElement*      webrtcbin;
    CameraPipeline*  pipeline;
};

gboolean CameraPipeline::doCreateOffer(gpointer data) {
    auto* ctx = static_cast<NegotiationCtx*>(data);
    auto* self = ctx->pipeline;
    self->offerSourceId_ = 0;
    if (self->failed_.load() || !self->webrtcbin_) {
        delete ctx;
        return G_SOURCE_REMOVE;
    }

    std::cout << "[" << timestamp() << "] Creating offer on main loop" << std::endl;
    GstPromise* promise = gst_promise_new_with_change_func(CameraPipeline::onOfferCreated, self, nullptr);
    g_signal_emit_by_name(self->webrtcbin_, "create-offer", nullptr, promise);
    delete ctx;
    return G_SOURCE_REMOVE;
}

// ── CameraPipeline ────────────────────────────────────────────────────────────

CameraPipeline::CameraPipeline(const CameraConfig& config, std::string stunServer)
    : config_(config), stunServer_(std::move(stunServer)) {}

CameraPipeline::~CameraPipeline() {
    stop();
}

bool CameraPipeline::start() {
    if (pipeline_) return true;
    failed_.store(false);
    {
        std::lock_guard<std::mutex> lock(errorMutex_);
        lastError_.clear();
    }

    auto specs = PlatformDetect::getPlatformSpecifics();
    if (config_.devicePath == "test") specs.source = "videotestsrc";

    std::string pipelineStr = buildPipelineString(config_, specs);
    std::cout << "[" << timestamp() << "] Starting pipeline: " << pipelineStr << std::endl;

    GError* error = nullptr;
    pipeline_ = gst_parse_launch(pipelineStr.c_str(), &error);
    if (error) {
        std::cerr << "[" << timestamp() << "] Pipeline parse error: " << error->message << std::endl;
        g_error_free(error);
        return false;
    }

    GstBus* bus = gst_element_get_bus(pipeline_);
    if (bus) {
        busWatchId_ = gst_bus_add_watch(bus, CameraPipeline::onBusMessage, this);
        gst_object_unref(bus);
    }

    webrtcbin_ = gst_bin_get_by_name(GST_BIN(pipeline_), "webrtcbin");
    if (!webrtcbin_) {
        std::cerr << "webrtcbin element not found" << std::endl;
        stop();
        return false;
    }

    if (!stunServer_.empty())
        g_object_set(webrtcbin_, "stun-server", stunServer_.c_str(), nullptr);

    g_signal_connect(webrtcbin_, "on-negotiation-needed", G_CALLBACK(onNegotiationNeeded), this);
    g_signal_connect(webrtcbin_, "on-ice-candidate",      G_CALLBACK(onIceCandidate),      this);

    // Probe h264parse src (alignment=au): one buffer per video frame, accurate FPS + bitrate.
    GstElement* parse = gst_bin_get_by_name(GST_BIN(pipeline_), "parse");
    if (parse) {
        GstPad* pad = gst_element_get_static_pad(parse, "src");
        if (pad) {
            frameCount_.store(0);
            byteCount_.store(0);
            lastStatsMs_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::steady_clock::now().time_since_epoch()).count());
            gst_pad_add_probe(pad, GST_PAD_PROBE_TYPE_BUFFER, statsProbe, this, nullptr);
            gst_object_unref(pad);
        }
        gst_object_unref(parse);
    }

    if (config_.exposure >= 0) {
        GstElement* src = gst_bin_get_by_name(GST_BIN(pipeline_), "src");
        if (src) {
            if (g_object_class_find_property(G_OBJECT_GET_CLASS(src), "extra-controls")) {
                GstStructure* ctrls = gst_structure_new("controls",
                    "exposure_auto",     G_TYPE_INT, 1,
                    "exposure_absolute", G_TYPE_INT, config_.exposure,
                    nullptr);
                g_object_set(src, "extra-controls", ctrls, nullptr);
                gst_structure_free(ctrls);
            }
            gst_object_unref(src);
        }
    }

    GstStateChangeReturn ret = gst_element_set_state(pipeline_, GST_STATE_PLAYING);
    if (ret == GST_STATE_CHANGE_FAILURE) {
        std::cerr << "[" << timestamp() << "] Failed to set pipeline to PLAYING" << std::endl;
        stop();
        return false;
    }
    if (ret == GST_STATE_CHANGE_ASYNC) {
        ret = gst_element_get_state(pipeline_, nullptr, nullptr, 2 * GST_SECOND);
        if (ret == GST_STATE_CHANGE_FAILURE || failed_.load()) {
            const std::string lastError = getLastError();
            std::cerr << "[" << timestamp() << "] Pipeline failed while starting"
                      << (lastError.empty() ? "" : ": " + lastError) << std::endl;
            stop();
            return false;
        }
    }
    std::cout << "[" << timestamp() << "] Pipeline state change: "
              << gst_element_state_change_return_get_name(ret) << std::endl;

    std::this_thread::sleep_for(std::chrono::milliseconds(150));
    if (failed_.load()) {
        const std::string lastError = getLastError();
        std::cerr << "[" << timestamp() << "] Pipeline failed during startup"
                  << (lastError.empty() ? "" : ": " + lastError) << std::endl;
        stop();
        return false;
    }

    // Fallback: explicitly schedule offer creation on the GLib main loop.
    // on-negotiation-needed may not fire reliably when set_state is called
    // from a non-main thread (e.g., the WebSocket thread).
    // offerScheduled_ prevents a double-offer if on-negotiation-needed also fires.
    bool expected = false;
    if (offerScheduled_.compare_exchange_strong(expected, true))
        offerSourceId_ = g_idle_add(CameraPipeline::doCreateOffer, new NegotiationCtx{webrtcbin_, this});

    return true;
}

void CameraPipeline::stop() {
    offerScheduled_.store(false);
    removeSourceIfActive(offerSourceId_);
    removeSourceIfActive(busWatchId_);
    if (webrtcbin_) {
        gst_element_set_state(webrtcbin_, GST_STATE_NULL);
        gst_object_unref(webrtcbin_);
        webrtcbin_ = nullptr;
    }
    if (pipeline_) {
        std::cout << "[" << timestamp() << "] Stopping pipeline" << std::endl;
        gst_element_set_state(pipeline_, GST_STATE_NULL);
        gst_element_get_state(pipeline_, nullptr, nullptr, 2 * GST_SECOND);
        gst_object_unref(pipeline_);
        pipeline_ = nullptr;
    }
}

void CameraPipeline::setRemoteAnswer(const std::string& sdp) {
    if (!webrtcbin_) return;
    GstSDPMessage* sdpMsg = nullptr;
    gst_sdp_message_new(&sdpMsg);
    gst_sdp_message_parse_buffer(reinterpret_cast<const guint8*>(sdp.c_str()), sdp.size(), sdpMsg);
    GstWebRTCSessionDescription* answer =
        gst_webrtc_session_description_new(GST_WEBRTC_SDP_TYPE_ANSWER, sdpMsg);
    GstPromise* promise = gst_promise_new();
    g_signal_emit_by_name(webrtcbin_, "set-remote-description", answer, promise);
    gst_promise_unref(promise);
    gst_webrtc_session_description_free(answer);
}

void CameraPipeline::addIceCandidate(const std::string& candidate, int sdpMLineIndex) {
    if (!webrtcbin_) return;
    g_signal_emit_by_name(webrtcbin_, "add-ice-candidate", sdpMLineIndex, candidate.c_str());
}

PipelineStats CameraPipeline::getStats() {
    long long nowMs = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count();
    long long lastMs = lastStatsMs_.exchange(nowMs);
    int       frames = frameCount_.exchange(0);
    long long bytes  = byteCount_.exchange(0);
    double elapsed   = (nowMs - lastMs) / 1000.0;
    PipelineStats s;
    if (elapsed > 0.01) {
        s.fps     = frames / elapsed;
        s.bitrate = static_cast<int>(bytes * 8 / elapsed);
    }
    return s;
}

std::string CameraPipeline::getLastError() const {
    std::lock_guard<std::mutex> lock(errorMutex_);
    return lastError_;
}

GstPadProbeReturn CameraPipeline::statsProbe(GstPad*, GstPadProbeInfo* info, gpointer user_data) {
    auto* self = static_cast<CameraPipeline*>(user_data);
    if (GstBuffer* buf = GST_PAD_PROBE_INFO_BUFFER(info)) {
        self->frameCount_.fetch_add(1, std::memory_order_relaxed);
        self->byteCount_.fetch_add(static_cast<long long>(gst_buffer_get_size(buf)),
                                   std::memory_order_relaxed);
    }
    return GST_PAD_PROBE_OK;
}

gboolean CameraPipeline::onBusMessage(GstBus*, GstMessage* message, gpointer user_data) {
    auto* self = static_cast<CameraPipeline*>(user_data);

    if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
        GError* err = nullptr;
        gchar* debug = nullptr;
        gst_message_parse_error(message, &err, &debug);

        std::ostringstream msg;
        msg << "GStreamer error";
        if (GST_MESSAGE_SRC(message))
            msg << " from " << GST_MESSAGE_SRC_NAME(message);
        if (err && err->message)
            msg << ": " << err->message;
        if (debug && *debug)
            msg << " (" << debug << ")";

        const std::string text = msg.str();
        {
            std::lock_guard<std::mutex> lock(self->errorMutex_);
            self->lastError_ = text;
        }
        self->failed_.store(true);
        self->busWatchId_ = 0;
        std::cerr << "[" << timestamp() << "] " << text << std::endl;
        if (isV4l2AllocationError(text)) {
            std::cerr << "[" << timestamp() << "] V4L2 allocation hint: this usually means USB/V4L2 buffer "
                      << "memory or bus bandwidth is exhausted. Check "
                      << "/sys/module/usbcore/parameters/usbfs_memory_mb, split cameras across USB "
                      << "controllers/hubs, or use a lower camera source mode." << std::endl;
        }
        if (self->onError_) self->onError_(text);

        if (err) g_error_free(err);
        if (debug) g_free(debug);
        return G_SOURCE_REMOVE;
    }

    if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS) {
        const std::string text = "GStreamer pipeline reached EOS";
        {
            std::lock_guard<std::mutex> lock(self->errorMutex_);
            self->lastError_ = text;
        }
        self->failed_.store(true);
        self->busWatchId_ = 0;
        std::cerr << "[" << timestamp() << "] " << text << std::endl;
        if (self->onError_) self->onError_(text);
        return G_SOURCE_REMOVE;
    }

    return G_SOURCE_CONTINUE;
}

void CameraPipeline::onNegotiationNeeded(GstElement* webrtcbin, gpointer user_data) {
    auto* self = static_cast<CameraPipeline*>(user_data);
    std::cout << "[" << timestamp() << "] on-negotiation-needed fired" << std::endl;
    bool expected = false;
    if (self->offerScheduled_.compare_exchange_strong(expected, true))
        self->offerSourceId_ = g_idle_add(CameraPipeline::doCreateOffer, new NegotiationCtx{webrtcbin, self});
}

void CameraPipeline::onIceCandidate(GstElement*, guint mlineindex, gchar* candidate, gpointer user_data) {
    auto* self = static_cast<CameraPipeline*>(user_data);
    if (self->onIceCandidate_) self->onIceCandidate_(candidate, mlineindex);
}

void CameraPipeline::onOfferCreated(GstPromise* promise, gpointer user_data) {
    std::cout << "[" << timestamp() << "] Offer created" << std::endl;
    auto* self = static_cast<CameraPipeline*>(user_data);
    if (self->failed_.load() || !self->webrtcbin_) {
        gst_promise_unref(promise);
        return;
    }

    const GstStructure* reply = gst_promise_get_reply(promise);
    GstWebRTCSessionDescription* offer = nullptr;
    gst_structure_get(reply, "offer", GST_TYPE_WEBRTC_SESSION_DESCRIPTION, &offer, nullptr);
    gst_promise_unref(promise);

    if (offer) {
        GstPromise* localDescPromise = gst_promise_new();
        g_signal_emit_by_name(self->webrtcbin_, "set-local-description", offer, localDescPromise);
        gst_promise_unref(localDescPromise);

        if (self->onOfferCreated_) {
            gchar* sdpStr = gst_sdp_message_as_text(offer->sdp);
            self->onOfferCreated_(sdpStr);
            g_free(sdpStr);
        }
        gst_webrtc_session_description_free(offer);
    }
}
