#pragma once

#include <libwebsockets.h>
#include <atomic>
#include <functional>
#include <map>
#include <mutex>
#include <queue>
#include <set>
#include <string>

class WsServer {
public:
    using MessageCallback = std::function<void(int clientId, const std::string& message)>;
    using ConnectCallback = std::function<void(int clientId)>;
    using DisconnectCallback = std::function<void(int clientId)>;

    WsServer();
    ~WsServer();

    bool start(int port);
    bool poll();
    void stop();
    void broadcastMessage(const std::string& message);
    void sendMessageToClient(int clientId, const std::string& message);
    std::set<int> getClientIds() const;

    void setOnMessageCallback(MessageCallback cb) { onMessage_ = cb; }
    void setOnConnectCallback(ConnectCallback cb)  { onConnect_ = cb; }
    void setOnDisconnectCallback(DisconnectCallback cb) { onDisconnect_ = cb; }

    int onWsCallback(lws* wsi, lws_callback_reasons reason, void* in, size_t len);

private:
    lws_context*    context_    = nullptr;
    int             nextClientId_ = 1;
    std::atomic<bool> running_{true};
    MessageCallback onMessage_;
    ConnectCallback onConnect_;
    DisconnectCallback onDisconnect_;

    mutable std::mutex              clientsMutex_;
    std::map<int, lws*>             clients_;
    std::map<lws*, int>             clientIdsByWsi_;
    std::map<int, std::queue<std::string>> messageQueues_;
};
