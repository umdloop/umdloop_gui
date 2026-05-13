#include <csignal>
#include <cstdlib>
#include <ctime>
#include <gst/gst.h>
#include <iostream>
#include <nlohmann/json.hpp>
#include <string>
#include <thread>
#include "CameraManager.hpp"
#include "MissionManager.hpp"
#include "WsServer.hpp"

using json = nlohmann::json;

static constexpr int kDefaultWsPort = 8081;

static const char* kConfigPath   = "cameras.json";
static const char* kMissionsPath = "missions.json";

static GMainLoop* gLoop = nullptr;

static void printUsage(const char* prog) {
    std::cerr << "Usage: " << prog << " [--ws-port <port>] [--stun-ip <ip>]\n"
              << "  --ws-port  WebSocket signaling port (default " << kDefaultWsPort << ")\n"
              << "  --stun-ip  IP of STUN server (coturn) running on this machine\n";
}

int main(int argc, char* argv[]) {
    int         wsPort   = kDefaultWsPort;
    std::string stunIp;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--ws-port" && i + 1 < argc) {
            int val = std::atoi(argv[++i]);
            if (val <= 0 || val > 65535) {
                std::cerr << "Invalid port: " << argv[i] << "\n";
                return 1;
            }
            wsPort = val;
        } else if (arg == "--stun-ip" && i + 1 < argc) {
            stunIp = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else {
            std::cerr << "Unknown argument: " << arg << "\n";
            printUsage(argv[0]);
            return 1;
        }
    }

    gst_init(&argc, &argv);

    CameraManager  manager;
    MissionManager missions;
    WsServer       ws;

    if (!stunIp.empty())
        manager.setStunServer("stun://" + stunIp + ":3478");

    auto sendState = [&](int clientId) {
        ws.sendMessageToClient(clientId, manager.buildStateJson(clientId));
    };
    auto broadcastState = [&]() {
        for (int clientId : ws.getClientIds())
            sendState(clientId);
    };
    auto sendMissionsState = [&]() {
        ws.broadcastMessage(missions.buildMissionsStateJson().dump());
    };
    auto sendMissionsStateToClient = [&](int clientId) {
        ws.sendMessageToClient(clientId, missions.buildMissionsStateJson().dump());
    };

    manager.setOfferCallback([&](int clientId, const std::string& id, const std::string& sdp) {
        ws.sendMessageToClient(clientId, json{
            {"type","offer"},
            {"client_id",clientId},
            {"id",id},
            {"sdp",sdp}
        }.dump());
    });
    manager.setIceCallback([&](int clientId, const std::string& id, const std::string& candidate, int mline) {
        ws.sendMessageToClient(clientId, json{
            {"type","ice"},
            {"client_id",clientId},
            {"id",id},
            {"candidate",candidate},
            {"sdpMLineIndex",mline}
        }.dump());
    });

    manager.loadConfigs(kConfigPath);
    manager.discoverCameras();
    manager.saveConfigs(kConfigPath);

    missions.load(kMissionsPath);

    ws.setOnConnectCallback([&](int clientId) {
        ws.sendMessageToClient(clientId, json{{"type","client"},{"client_id",clientId}}.dump());
        sendState(clientId);
        sendMissionsStateToClient(clientId);
    });

    ws.setOnDisconnectCallback([&](int clientId) {
        manager.disconnectClient(clientId);
        broadcastState();
    });

    ws.setOnMessageCallback([&](int clientId, const std::string& raw) {
        try {
            auto msg  = json::parse(raw);
            auto type = msg["type"].get<std::string>();

            if (type == "answer") {
                manager.setRemoteAnswer(clientId, msg["id"], msg["sdp"]);
            } else if (type == "ice") {
                manager.addIceCandidate(clientId, msg["id"], msg["candidate"], msg["sdpMLineIndex"]);
            } else if (type == "enable") {
                manager.enableCamera(clientId, msg["camera_id"]);
                broadcastState();
            } else if (type == "disable") {
                manager.disableCamera(clientId, msg["camera_id"]);
                broadcastState();
            } else if (type == "set_config") {
                manager.applyConfigPatch(msg["camera_id"], msg["config"]);
                manager.saveConfigs(kConfigPath);
                broadcastState();
            } else if (type == "rename") {
                manager.renameCamera(msg["camera_id"], msg["name"]);
                manager.saveConfigs(kConfigPath);
                broadcastState();
            } else if (type == "list_missions") {
                sendMissionsStateToClient(clientId);
            } else if (type == "save_mission") {
                std::string mName = msg.value("name", "Unnamed Mission");
                std::string mId   = msg.value("id",   "");
                if (mId.empty())
                    mId = "mission_" + std::to_string(std::time(nullptr));
                missions.saveMission(mId, mName, manager.getConfigs());
                missions.save(kMissionsPath);
                sendMissionsState();
            } else if (type == "load_mission") {
                const auto* m = missions.getMission(msg["id"]);
                if (m) {
                    for (const auto& [camId, cfg] : m->cameras)
                        manager.updateConfig(camId, cfg);
                    manager.saveConfigs(kConfigPath);
                    missions.setActiveMission(msg["id"]);
                    missions.save(kMissionsPath);
                    broadcastState();
                    sendMissionsState();
                }
            } else if (type == "delete_mission") {
                missions.deleteMission(msg["id"]);
                missions.save(kMissionsPath);
                sendMissionsState();
            } else if (type == "set_active_mission") {
                missions.setActiveMission(msg["id"]);
                missions.save(kMissionsPath);
                sendMissionsState();
            }
        } catch (const std::exception& e) {
            std::cerr << "ws message error for client=" << clientId << ": " << e.what() << std::endl;
        }
    });

    if (!ws.start(wsPort)) {
        std::cerr << "Failed to start WebSocket server" << std::endl;
        return 1;
    }


    std::thread wsThread([&]() {
        while (ws.poll()) {}
    });

    struct StatsCtx { CameraManager* m; WsServer* s; } statsCtx{&manager, &ws};
    g_timeout_add(500, [](gpointer data) -> gboolean {
        auto& ctx = *static_cast<StatsCtx*>(data);
        if (ctx.m->reapFailedPipelines())
            for (int clientId : ctx.s->getClientIds())
                ctx.s->sendMessageToClient(clientId, ctx.m->buildStateJson(clientId));
        for (const auto& [clientId, id] : ctx.m->getActiveViews()) {
            auto s = ctx.m->getCameraStats(clientId, id);
            ctx.s->sendMessageToClient(clientId, json{
                {"type",      "stats"},
                {"client_id", clientId},
                {"camera_id", id},
                {"fps",       s.fps},
                {"bitrate",   s.bitrate},
            }.dump());
        }
        return TRUE;
    }, &statsCtx);

    gLoop = g_main_loop_new(nullptr, FALSE);

    signal(SIGINT,  [](int) { if (gLoop) g_main_loop_quit(gLoop); });
    signal(SIGTERM, [](int) { if (gLoop) g_main_loop_quit(gLoop); });

    g_main_loop_run(gLoop);
    g_main_loop_unref(gLoop);

    ws.stop();
    wsThread.join();
    return 0;
}
