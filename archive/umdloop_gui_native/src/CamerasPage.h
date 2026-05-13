#ifndef CAMERASPAGE_H
#define CAMERASPAGE_H

#include <QWidget>
#include <QVBoxLayout>
#include <QScrollArea>
#include <vector>
#include <string>
#include <utility>
#include "CameraWidget.h"

// Forward declaration
class CameraOverlay;

// Cameras Page
class CamerasPage : public QWidget {
    Q_OBJECT
public:
    explicit CamerasPage(int subsystem, QWidget *parent = nullptr);
    void updateSubsystem(int subsystem);

private slots:
    void onCameraGroupClicked(const QString &label, const std::vector<int> &cameraIds);

private:
    int currentSubsystem;
    QVBoxLayout *mainLayout;
    std::vector<CameraWidget*> cameraWidgets;
    CameraOverlay *overlay;

    void setupDriveCameras();
    void setupArmCameras();
    void setupScienceCameras();
    void clearLayout();
    std::vector<std::pair<std::string, std::vector<int>>> getCameraIds(int subsystem);
};

#endif // CAMERASPAGE_H
