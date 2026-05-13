#include "CameraWidget.h"
#include <QMediaDevices>
#include <QGridLayout>
#include <QString>

// ========================================
// CameraWidget Implementation
// ========================================

CameraWidget::CameraWidget(int cameraId, QWidget *parent)
    : QWidget(parent), cameraId(cameraId), camera(nullptr), captureSession(nullptr) {

    layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);

    videoWidget = new QVideoWidget(this);
    videoWidget->setMinimumSize(320, 240);
    videoWidget->setStyleSheet("background-color: #1a1a1a; border: 1px solid #333; border-radius: 8px;");

    statusLabel = new QLabel(QString("Camera %1").arg(cameraId), this);
    statusLabel->setAlignment(Qt::AlignCenter);
    statusLabel->setStyleSheet("color: #888; font-size: 12px; padding: 5px;");

    layout->addWidget(videoWidget);
    layout->addWidget(statusLabel);

    setStyleSheet("background-color: transparent;");
}

void CameraWidget::startStreaming() {
    // Get available cameras
    const QList<QCameraDevice> cameras = QMediaDevices::videoInputs();

    if (cameras.isEmpty()) {
        statusLabel->setText(QString("Camera %1 - No devices found").arg(cameraId));
        statusLabel->setStyleSheet("color: #f88; font-size: 12px; padding: 5px;");
        return;
    }

    // Check if this camera ID has an actual physical camera
    if (cameraId >= cameras.size()) {
        statusLabel->setText(QString("Camera %1 - Not connected").arg(cameraId));
        statusLabel->setStyleSheet("color: #fa0; font-size: 12px; padding: 5px;");
        return;
    }

    // Use the camera at this specific index
    const QCameraDevice &cameraDevice = cameras.at(cameraId);

    camera = new QCamera(cameraDevice, this);
    captureSession = new QMediaCaptureSession(this);
    captureSession->setCamera(camera);
    captureSession->setVideoOutput(videoWidget);

    camera->start();

    statusLabel->setText(QString("Camera %1 - %2").arg(cameraId).arg(cameraDevice.description()));
    statusLabel->setStyleSheet("color: #4f4; font-size: 12px; padding: 5px;");
}

void CameraWidget::stopStreaming() {
    if (camera) {
        camera->stop();
        delete camera;
        camera = nullptr;
    }
    if (captureSession) {
        delete captureSession;
        captureSession = nullptr;
    }
}

void CameraWidget::mousePressEvent(QMouseEvent *event) {
    Q_UNUSED(event);
    emit clicked(cameraId);
}

// ========================================
// CameraOverlay Implementation
// ========================================

CameraOverlay::CameraOverlay(const QString &title, const std::vector<int> &cameraIds, QWidget *parent)
    : QWidget(parent) {

    // Make fullscreen overlay
    setWindowFlags(Qt::Window | Qt::FramelessWindowHint);
    setAttribute(Qt::WA_TranslucentBackground, false);
    setStyleSheet("background-color: rgba(0, 0, 0, 200);"); // Semi-transparent black

    // Main layout
    mainLayout = new QVBoxLayout(this);
    mainLayout->setAlignment(Qt::AlignCenter);

    // Content widget with solid background
    contentWidget = new QWidget(this);
    contentWidget->setStyleSheet(
        "background-color: #18181b; "
        "border-radius: 12px; "
        "padding: 20px;"
    );
    contentWidget->setMaximumWidth(1200);

    auto *contentLayout = new QVBoxLayout(contentWidget);

    // Title
    auto *titleLabel = new QLabel(title, contentWidget);
    titleLabel->setAlignment(Qt::AlignCenter);
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;");
    contentLayout->addWidget(titleLabel);

    // Camera grid
    auto *gridWidget = new QWidget(contentWidget);
    auto *gridLayout = new QGridLayout(gridWidget);
    gridLayout->setSpacing(15);

    int cols = (cameraIds.size() == 1) ? 1 : 2;
    for (size_t i = 0; i < cameraIds.size(); ++i) {
        auto *cam = new CameraWidget(cameraIds[i], gridWidget);
        cam->startStreaming();
        cameraWidgets.push_back(cam);

        int row = i / cols;
        int col = i % cols;
        gridLayout->addWidget(cam, row, col);
    }

    contentLayout->addWidget(gridWidget);

    // Help text
    auto *helpLabel = new QLabel("(Click outside or press ESC to exit)", contentWidget);
    helpLabel->setAlignment(Qt::AlignCenter);
    helpLabel->setStyleSheet("color: #888; font-size: 14px; margin-top: 20px;");
    contentLayout->addWidget(helpLabel);

    mainLayout->addWidget(contentWidget);

    // Set focus to receive key events
    setFocusPolicy(Qt::StrongFocus);
    setFocus();
}

CameraOverlay::~CameraOverlay() {
    for (auto *cam : cameraWidgets) {
        cam->stopStreaming();
    }
}

void CameraOverlay::keyPressEvent(QKeyEvent *event) {
    if (event->key() == Qt::Key_Escape) {
        close();
        deleteLater();
    }
}

void CameraOverlay::mousePressEvent(QMouseEvent *event) {
    // Close if clicking outside the content widget
    if (!contentWidget->geometry().contains(event->pos())) {
        close();
        deleteLater();
    }
}
