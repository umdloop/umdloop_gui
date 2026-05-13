#ifndef LOOPGUI_H
#define LOOPGUI_H

#include <QMainWindow>
#include <QStackedWidget>
#include "NavigationBar.h"
#include "SubsystemWidget.h"
#include "CamerasPage.h"
#include "ROS2EntitiesPage.h"
#include "GenericPage.h"

// Main Window
class LoopGui : public QMainWindow {
    Q_OBJECT
public:
    explicit LoopGui(QWidget *parent = nullptr);
    ~LoopGui();
    
private slots:
    void onModeChanged(int modeIndex);
    void onSubsystemChanged(int subsystemIndex);
    
private:
    NavigationBar *navBar;
    SubsystemWidget *subsystemWidget;
    QStackedWidget *contentStack;
    
    int currentMode = 0;
    int currentSubsystem = 0;
    
    // Pages for each mode
    GenericPage *simulationPage;
    CamerasPage *camerasPage;
    GenericPage *sensorsPage;
    ROS2EntitiesPage *ros2Page;
    GenericPage *navigationPage;
    GenericPage *missionPage;
    
    void setupUI();
    void updateContent();
};

#endif // LOOPGUI_H
