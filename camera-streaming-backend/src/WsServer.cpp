#include "WsServer.hpp"
#include <cstring>
#include <iostream>
#include <vector>

static int callback_ws(struct lws* wsi, enum lws_callback_reasons reason, void* user, void* in, size_t len) {
    auto* server = reinterpret_cast<WsServer*>(lws_context_user(lws_get_context(wsi)));
    return server ? server->onWsCallback(wsi, reason, in, len) : 0;
}

static struct lws_protocols protocols[] = {
    { "webrtc-protocol", callback_ws, 0, 65536 },
    { nullptr, nullptr, 0, 0 }
};

WsServer::WsServer() {}

WsServer::~WsServer() {
    if (context_) lws_context_destroy(context_);
}

bool WsServer::start(int port) {
    lws_context_creation_info info{};
    info.port      = port;
    info.protocols = protocols;
    info.user      = this;

    context_ = lws_create_context(&info);
    if (!context_) {
        std::cerr << "lws init failed" << std::endl;
        return false;
    }
    std::cout << "WebSocket server started on port " << port << std::endl;
    return true;
}

bool WsServer::poll() {
    if (!running_ || !context_) return false;
    lws_service(context_, 50);
    return running_.load();
}

void WsServer::stop() {
    running_ = false;
    if (context_) lws_cancel_service(context_);
}

void WsServer::broadcastMessage(const std::string& message) {
    {
        std::lock_guard<std::mutex> lock(clientsMutex_);
        for (const auto& [clientId, _] : clients_)
            messageQueues_[clientId].push(message);
    }
    if (context_) lws_cancel_service(context_);
}

void WsServer::sendMessageToClient(int clientId, const std::string& message) {
    {
        std::lock_guard<std::mutex> lock(clientsMutex_);
        if (!clients_.count(clientId)) return;
        messageQueues_[clientId].push(message);
    }
    if (context_) lws_cancel_service(context_);
}

std::set<int> WsServer::getClientIds() const {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    std::set<int> ids;
    for (const auto& [clientId, _] : clients_)
        ids.insert(clientId);
    return ids;
}

int WsServer::onWsCallback(lws* wsi, lws_callback_reasons reason, void* in, size_t len) {
    switch (reason) {
        case LWS_CALLBACK_ESTABLISHED: {
            int clientId = nextClientId_++;
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                clients_[clientId] = wsi;
                clientIdsByWsi_[wsi] = clientId;
            }
            std::cout << "Client connected: id=" << clientId << std::endl;
            if (onConnect_) onConnect_(clientId);
            lws_callback_on_writable(wsi);
            break;
        }

        case LWS_CALLBACK_CLOSED: {
            int clientId = 0;
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                auto it = clientIdsByWsi_.find(wsi);
                if (it != clientIdsByWsi_.end()) {
                    clientId = it->second;
                    clientIdsByWsi_.erase(it);
                    clients_.erase(clientId);
                    messageQueues_.erase(clientId);
                }
            }
            if (clientId) {
                std::cout << "Client disconnected: id=" << clientId << std::endl;
                if (onDisconnect_) onDisconnect_(clientId);
            }
            break;
        }

        case LWS_CALLBACK_RECEIVE: {
            int clientId = 0;
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                auto it = clientIdsByWsi_.find(wsi);
                if (it != clientIdsByWsi_.end()) clientId = it->second;
            }
            if (clientId && onMessage_ && in)
                onMessage_(clientId, std::string(static_cast<char*>(in), len));
            break;
        }

        case LWS_CALLBACK_EVENT_WAIT_CANCELLED:
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                for (const auto& [_, clientWsi] : clients_)
                    lws_callback_on_writable(clientWsi);
            }
            break;

        case LWS_CALLBACK_SERVER_WRITEABLE: {
            int clientId = 0;
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                auto idIt = clientIdsByWsi_.find(wsi);
                if (idIt == clientIdsByWsi_.end()) break;
                clientId = idIt->second;
                auto queueIt = messageQueues_.find(clientId);
                if (queueIt == messageQueues_.end()) break;

                while (!queueIt->second.empty()) {
                    std::string msg = queueIt->second.front();
                    queueIt->second.pop();
                    std::vector<unsigned char> buf(LWS_PRE + msg.size());
                    memcpy(&buf[LWS_PRE], msg.c_str(), msg.size());
                    lws_write(wsi, &buf[LWS_PRE], msg.size(), LWS_WRITE_TEXT);
                }
            }
            {
                std::lock_guard<std::mutex> lock(clientsMutex_);
                if (messageQueues_.count(clientId) && !messageQueues_[clientId].empty())
                    lws_callback_on_writable(wsi);
            }
            break;
        }

        default:
            break;
    }
    return 0;
}
