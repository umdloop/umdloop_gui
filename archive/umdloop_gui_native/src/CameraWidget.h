#ifndef CAMERAWIDGET_H
#define CAMERAWIDGET_H

#include <QWidget>
#include <QLabel>
#include <QVBoxLayout>
#include <QCamera>
#include <QMediaCaptureSession>
#include <QVideoWidget>
#include <QKeyEvent>
#include <QMouseEvent>
#include <vector>

// Camera Display Widget
class CameraWidget : public QWidget {
    Q_OBJECT
public:
    explicit CameraWidget(int cameraId, QWidget *parent = nullptr);
    void startStreaming();
    void stopStreaming();

protected:
    void mousePressEvent(QMouseEvent *event) override;

signals:
    void clicked(int cameraId);

private:
    int cameraId;
    QCamera *camera;
    QMediaCaptureSession *captureSession;
    QVideoWidget *videoWidget;
    QVBoxLayout *layout;
    QLabel *statusLabel;
};

// Fullscreen Camera Overlay
class CameraOverlay : public QWidget {
    Q_OBJECT
public:
    explicit CameraOverlay(const QString &title, const std::vector<int> &cameraIds, QWidget *parent = nullptr);
    ~CameraOverlay();

protected:
    void keyPressEvent(QKeyEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;

private:
    QVBoxLayout *mainLayout;
    QWidget *contentWidget;
    std::vector<CameraWidget*> cameraWidgets;
};

#endif // CAMERAWIDGET_H
