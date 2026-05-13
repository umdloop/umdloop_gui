#include "ROS2EntitiesPage.h"
#include "Constants.h"
#include <QVBoxLayout>
#include <QJsonDocument>
#include <QJsonObject>
#include <QString>
#include <QTextCursor>

ROS2EntitiesPage::ROS2EntitiesPage(int subsystem, QWidget *parent)
    : QWidget(parent), currentSubsystem(subsystem) {

    auto *layout = new QVBoxLayout(this);

    auto *title = new QLabel(QString::fromStdString(SUBSYSTEMS[subsystem]) + " - ROS2 Entities", this);
    title->setAlignment(Qt::AlignCenter);
    title->setStyleSheet("font-size: 24px; font-weight: bold;");
    layout->addWidget(title);

    statusLabel = new QLabel("ROS: connecting...", this);
    statusLabel->setAlignment(Qt::AlignCenter);
    layout->addWidget(statusLabel);

    messageDisplay = new QTextEdit(this);
    messageDisplay->setReadOnly(true);
    messageDisplay->setStyleSheet(
        "background-color: black; "
        "color: #00ff00; "
        "font-family: monospace; "
        "padding: 10px;"
    );
    messageDisplay->setMinimumHeight(400);
    layout->addWidget(messageDisplay);

    webSocket = new QWebSocket();
    connect(webSocket, &QWebSocket::connected, this, &ROS2EntitiesPage::onConnected);
    connect(webSocket, &QWebSocket::disconnected, this, &ROS2EntitiesPage::onDisconnected);
    connect(webSocket, &QWebSocket::textMessageReceived, this, &ROS2EntitiesPage::onTextMessageReceived);

    updateTopics();
    connectToROS();
}

void ROS2EntitiesPage::updateSubsystem(int subsystem) {
    currentSubsystem = subsystem;
    updateTopics();
    messageDisplay->clear();
    webSocket->close();
    connectToROS();
}

void ROS2EntitiesPage::updateTopics() {
    subscriptionTopics.clear();
    subscriptionMsgTypes.clear();

    if (currentSubsystem == 1) { // Arm
        subscriptionTopics = {"/joint_states", "/controller_input", "/can_tx", "/can_rx"};
        subscriptionMsgTypes = {
            "sensor_msgs/msg/JointState",
            "sensor_msgs/msg/Joy",
            "umdloop_theseus_can_messages/msg/CANA",
            "umdloop_theseus_can_messages/msg/CANA"
        };
    } else if (currentSubsystem == 0) { // Drive
        subscriptionTopics = {"/cmd_vel", "/odom"};
        subscriptionMsgTypes = {
            "geometry_msgs/msg/Twist",
            "nav_msgs/msg/Odometry"
        };
    }
}

void ROS2EntitiesPage::connectToROS() {
    webSocket->open(QUrl("ws://localhost:9090"));
}

void ROS2EntitiesPage::onConnected() {
    statusLabel->setText("ROS: ✅ connected");

    // Subscribe to topics
    for (size_t i = 0; i < subscriptionTopics.size(); ++i) {
        QJsonObject msg;
        msg["op"] = "subscribe";
        msg["topic"] = QString::fromStdString(subscriptionTopics[i]);
        msg["type"] = QString::fromStdString(subscriptionMsgTypes[i]);

        webSocket->sendTextMessage(QJsonDocument(msg).toJson(QJsonDocument::Compact));
    }
}

void ROS2EntitiesPage::onDisconnected() {
    statusLabel->setText("ROS: 🔴 closed");
}

void ROS2EntitiesPage::onTextMessageReceived(const QString &message) {
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    QString formatted = doc.toJson(QJsonDocument::Indented);

    // Keep only last 20 messages
    messageDisplay->append(formatted.left(500) + "\n---");

    // Auto-scroll to bottom
    QTextCursor cursor = messageDisplay->textCursor();
    cursor.movePosition(QTextCursor::End);
    messageDisplay->setTextCursor(cursor);
}
