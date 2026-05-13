#include "LoopGui.h"
#include <QVBoxLayout>
#include <QWidget>

// ========================================
// LoopGui Implementation
// ========================================

LoopGui::LoopGui(QWidget *parent) : QMainWindow(parent) {
    setupUI();
}

LoopGui::~LoopGui() {
}

void LoopGui::setupUI() {
    auto *centralWidget = new QWidget(this);
    auto *mainLayout = new QVBoxLayout(centralWidget);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);
    
    // Navigation bar
    navBar = new NavigationBar(centralWidget);
    connect(navBar, &NavigationBar::modeChanged, this, &LoopGui::onModeChanged);
    mainLayout->addWidget(navBar);
    
    // Subsystem selector
    subsystemWidget = new SubsystemWidget(centralWidget);
    connect(subsystemWidget, &SubsystemWidget::subsystemChanged, this, &LoopGui::onSubsystemChanged);
    mainLayout->addWidget(subsystemWidget);
    
    // Content area
    contentStack = new QStackedWidget(centralWidget);
    
    simulationPage = new GenericPage("Simulation", 0, contentStack);
    camerasPage = new CamerasPage(0, contentStack);
    sensorsPage = new GenericPage("Sensors", 0, contentStack);
    ros2Page = new ROS2EntitiesPage(0, contentStack);
    navigationPage = new GenericPage("Navigation", 0, contentStack);
    missionPage = new GenericPage("Mission", 0, contentStack);
    
    contentStack->addWidget(simulationPage);
    contentStack->addWidget(camerasPage);
    contentStack->addWidget(sensorsPage);
    contentStack->addWidget(ros2Page);
    contentStack->addWidget(navigationPage);
    contentStack->addWidget(missionPage);
    
    mainLayout->addWidget(contentStack);
    
    setCentralWidget(centralWidget);
    setWindowTitle("Loop GUI");
    resize(1400, 900);
}

void LoopGui::onModeChanged(int modeIndex) {
    currentMode = modeIndex;
    updateContent();
}

void LoopGui::onSubsystemChanged(int subsystemIndex) {
    currentSubsystem = subsystemIndex;
    updateContent();
}

void LoopGui::updateContent() {
    contentStack->setCurrentIndex(currentMode);
    
    // Update the current page with the new subsystem
    switch (currentMode) {
        case 0: simulationPage->updateSubsystem(currentSubsystem); break;
        case 1: camerasPage->updateSubsystem(currentSubsystem); break;
        case 2: sensorsPage->updateSubsystem(currentSubsystem); break;
        case 3: ros2Page->updateSubsystem(currentSubsystem); break;
        case 4: navigationPage->updateSubsystem(currentSubsystem); break;
        case 5: missionPage->updateSubsystem(currentSubsystem); break;
    }
}