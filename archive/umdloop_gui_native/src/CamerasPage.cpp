#include "CamerasPage.h"
#include "Constants.h"
#include <QLabel>
#include <QPushButton>
#include <QGridLayout>
#include <QString>

CamerasPage::CamerasPage(int subsystem, QWidget *parent)
    : QWidget(parent), currentSubsystem(subsystem), overlay(nullptr) {
    mainLayout = new QVBoxLayout(this);
    updateSubsystem(subsystem);
}

void CamerasPage::onCameraGroupClicked(const QString &label, const std::vector<int> &cameraIds) {
    if (overlay) {
        overlay->close();
        overlay->deleteLater();
        overlay = nullptr;
    }

    // Stop all cameras in the main view to release camera devices
    for (auto *cam : cameraWidgets) {
        cam->stopStreaming();
    }

    overlay = new CameraOverlay(label, cameraIds, window());

    // Connect destroyed signal to restart main view cameras and clear pointer
    connect(overlay, &QObject::destroyed, this, [this]() {
        // Restart all cameras in the main view
        for (auto *cam : cameraWidgets) {
            cam->startStreaming();
        }
        overlay = nullptr;
    });

    overlay->showFullScreen();
}

std::vector<std::pair<std::string, std::vector<int>>> CamerasPage::getCameraIds(int subsystem) {
    std::vector<std::pair<std::string, std::vector<int>>> cameraIds;

    if (subsystem == 0) { // Drive
        cameraIds.push_back({"Top Left", {0, 1}});
        cameraIds.push_back({"Top Right", {2, 3}});
        cameraIds.push_back({"Front", {15}});
        cameraIds.push_back({"Bottom Left", {4, 5}});
        cameraIds.push_back({"Bottom Right", {6, 7}});
    } else if (subsystem == 1) { // Arm
        cameraIds.push_back({"Base", {8}});
        cameraIds.push_back({"Joint", {9}});
        cameraIds.push_back({"End Effector", {10, 11}});
    } else if (subsystem == 2) { // Science
        cameraIds.push_back({"Cam 1", {12}});
        cameraIds.push_back({"Cam 2", {13}});
        cameraIds.push_back({"Cam 3", {14}});
    }

    return cameraIds;
}

void CamerasPage::clearLayout() {
    QLayoutItem *item;
    while ((item = mainLayout->takeAt(0)) != nullptr) {
        if (item->widget()) {
            item->widget()->deleteLater();
        }
        delete item;
    }

    for (auto *cam : cameraWidgets) {
        cam->stopStreaming();
    }
    cameraWidgets.clear();
}

void CamerasPage::updateSubsystem(int subsystem) {
    currentSubsystem = subsystem;
    clearLayout();

    auto *title = new QLabel(QString::fromStdString(SUBSYSTEMS[subsystem]) + " – Cameras", this);
    title->setAlignment(Qt::AlignCenter);
    title->setStyleSheet("font-size: 24px; font-weight: bold; margin: 10px;");
    mainLayout->addWidget(title);

    if (subsystem == 0) setupDriveCameras();
    else if (subsystem == 1) setupArmCameras();
    else if (subsystem == 2) setupScienceCameras();
}

void CamerasPage::setupDriveCameras() {
    auto cameraIds = getCameraIds(0);

    // Create scroll area
    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setStyleSheet("QScrollArea { border: none; background-color: transparent; }");

    // Create container widget for the grid
    auto *containerWidget = new QWidget();
    auto *gridLayout = new QGridLayout(containerWidget);
    gridLayout->setSpacing(10);

    // Layout: Row 0: Top Left, Top Right, Front
    //         Row 1: Bottom Left, Bottom Right, (empty)
    int idx = 0;
    for (const auto &[label, ids] : cameraIds) {
        // Use QPushButton as clickable container
        auto *button = new QPushButton(containerWidget);
        button->setFlat(true);
        button->setCursor(Qt::PointingHandCursor);
        button->setStyleSheet(
            "QPushButton { "
            "  background-color: #1a1a1a; "
            "  border-radius: 12px; "
            "  padding: 0px; "
            "  text-align: left; "
            "  border: none; "
            "}"
            "QPushButton:hover { background-color: #252525; }"
        );

        auto *contentWidget = new QWidget(button);
        contentWidget->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Preferred);
        auto *layout = new QVBoxLayout(contentWidget);
        layout->setContentsMargins(10, 10, 10, 10);
        layout->setSpacing(5);

        auto *titleLabel = new QLabel(QString::fromStdString(label), contentWidget);
        titleLabel->setAlignment(Qt::AlignCenter);
        titleLabel->setStyleSheet("font-size: 16px; font-weight: bold; color: white; background-color: transparent;");
        titleLabel->setAttribute(Qt::WA_TransparentForMouseEvents);
        layout->addWidget(titleLabel);

        for (int id : ids) {
            auto *cam = new CameraWidget(id, contentWidget);
            cam->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
            cam->startStreaming();
            cam->setAttribute(Qt::WA_TransparentForMouseEvents);
            cameraWidgets.push_back(cam);
            layout->addWidget(cam);
        }

        auto *buttonLayout = new QVBoxLayout(button);
        buttonLayout->setContentsMargins(0, 0, 0, 0);
        buttonLayout->setSizeConstraint(QLayout::SetMinimumSize);
        buttonLayout->addWidget(contentWidget);

        // Connect click event
        QString qLabel = QString::fromStdString(label);
        std::vector<int> camIds = ids;
        connect(button, &QPushButton::clicked, this, [this, qLabel, camIds]() {
            onCameraGroupClicked(qLabel, camIds);
        });

        int row = idx / 3;
        int col = idx % 3;
        gridLayout->addWidget(button, row, col);
        idx++;
    }

    scrollArea->setWidget(containerWidget);
    mainLayout->addWidget(scrollArea);
}

void CamerasPage::setupArmCameras() {
    auto cameraIds = getCameraIds(1);

    // Create scroll area
    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setStyleSheet("QScrollArea { border: none; background-color: transparent; }");

    // Create container widget for the horizontal layout
    auto *containerWidget = new QWidget();
    auto *hLayout = new QHBoxLayout(containerWidget);
    hLayout->setSpacing(10);

    for (const auto &[label, ids] : cameraIds) {
        // Use QPushButton as clickable container
        auto *button = new QPushButton(containerWidget);
        button->setFlat(true);
        button->setCursor(Qt::PointingHandCursor);
        button->setStyleSheet(
            "QPushButton { "
            "  background-color: #1a1a1a; "
            "  border-radius: 12px; "
            "  padding: 0px; "
            "  text-align: left; "
            "  border: none; "
            "}"
            "QPushButton:hover { background-color: #252525; }"
        );

        auto *contentWidget = new QWidget(button);
        contentWidget->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Preferred);
        auto *layout = new QVBoxLayout(contentWidget);
        layout->setContentsMargins(10, 10, 10, 10);
        layout->setSpacing(5);

        auto *titleLabel = new QLabel(QString::fromStdString(label), contentWidget);
        titleLabel->setAlignment(Qt::AlignCenter);
        titleLabel->setStyleSheet("font-size: 16px; font-weight: bold; color: white; background-color: transparent;");
        titleLabel->setAttribute(Qt::WA_TransparentForMouseEvents);
        layout->addWidget(titleLabel);

        for (int id : ids) {
            auto *cam = new CameraWidget(id, contentWidget);
            cam->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
            cam->startStreaming();
            cam->setAttribute(Qt::WA_TransparentForMouseEvents);
            cameraWidgets.push_back(cam);
            layout->addWidget(cam);
        }

        auto *buttonLayout = new QVBoxLayout(button);
        buttonLayout->setContentsMargins(0, 0, 0, 0);
        buttonLayout->setSizeConstraint(QLayout::SetMinimumSize);
        buttonLayout->addWidget(contentWidget);

        // Connect click event
        QString qLabel = QString::fromStdString(label);
        std::vector<int> camIds = ids;
        connect(button, &QPushButton::clicked, this, [this, qLabel, camIds]() {
            onCameraGroupClicked(qLabel, camIds);
        });

        hLayout->addWidget(button);
    }

    scrollArea->setWidget(containerWidget);
    mainLayout->addWidget(scrollArea);
}

void CamerasPage::setupScienceCameras() {
    auto cameraIds = getCameraIds(2);

    // Create scroll area
    auto *scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollArea->setStyleSheet("QScrollArea { border: none; background-color: transparent; }");

    // Create container widget for the horizontal layout
    auto *containerWidget = new QWidget();
    auto *hLayout = new QHBoxLayout(containerWidget);
    hLayout->setSpacing(10);

    for (const auto &[label, ids] : cameraIds) {
        // Use QPushButton as clickable container
        auto *button = new QPushButton(containerWidget);
        button->setFlat(true);
        button->setCursor(Qt::PointingHandCursor);
        button->setStyleSheet(
            "QPushButton { "
            "  background-color: #1a1a1a; "
            "  border-radius: 12px; "
            "  padding: 0px; "
            "  text-align: left; "
            "  border: none; "
            "}"
            "QPushButton:hover { background-color: #252525; }"
        );

        auto *contentWidget = new QWidget(button);
        contentWidget->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Preferred);
        auto *layout = new QVBoxLayout(contentWidget);
        layout->setContentsMargins(10, 10, 10, 10);
        layout->setSpacing(5);

        auto *titleLabel = new QLabel(QString::fromStdString(label), contentWidget);
        titleLabel->setAlignment(Qt::AlignCenter);
        titleLabel->setStyleSheet("font-size: 16px; font-weight: bold; color: white; background-color: transparent;");
        titleLabel->setAttribute(Qt::WA_TransparentForMouseEvents);
        layout->addWidget(titleLabel);

        for (int id : ids) {
            auto *cam = new CameraWidget(id, contentWidget);
            cam->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
            cam->startStreaming();
            cam->setAttribute(Qt::WA_TransparentForMouseEvents);
            cameraWidgets.push_back(cam);
            layout->addWidget(cam);
        }

        auto *buttonLayout = new QVBoxLayout(button);
        buttonLayout->setContentsMargins(0, 0, 0, 0);
        buttonLayout->setSizeConstraint(QLayout::SetMinimumSize);
        buttonLayout->addWidget(contentWidget);

        // Connect click event
        QString qLabel = QString::fromStdString(label);
        std::vector<int> camIds = ids;
        connect(button, &QPushButton::clicked, this, [this, qLabel, camIds]() {
            onCameraGroupClicked(qLabel, camIds);
        });

        hLayout->addWidget(button);
    }

    scrollArea->setWidget(containerWidget);
    mainLayout->addWidget(scrollArea);
}
