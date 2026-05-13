#ifndef ROS2ENTITIESPAGE_H
#define ROS2ENTITIESPAGE_H

#include <QWidget>
#include <QLabel>
#include <QTextEdit>
#include <QWebSocket>
#include <vector>
#include <string>

// ROS2 Entities Page
class ROS2EntitiesPage : public QWidget {
    Q_OBJECT
public:
    explicit ROS2EntitiesPage(int subsystem, QWidget *parent = nullptr);
    void updateSubsystem(int subsystem);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(const QString &message);

private:
    int currentSubsystem;
    QWebSocket *webSocket;
    QLabel *statusLabel;
    QTextEdit *messageDisplay;
    std::vector<std::string> subscriptionTopics;
    std::vector<std::string> subscriptionMsgTypes;

    void connectToROS();
    void updateTopics();
};

#endif // ROS2ENTITIESPAGE_H
