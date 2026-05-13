cmake_minimum_required(VERSION 3.16)
project(LoopGui VERSION 1.0 LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt Auto-generation tools
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Find Qt6 packages
find_package(Qt6 REQUIRED COMPONENTS
    Core
    Widgets
    Network
    WebSockets
    Multimedia
    MultimediaWidgets
)

# Source files
set(SOURCES
    src/main.cpp
    src/LoopGui.cpp
    src/NavigationBar.cpp
    src/SubsystemWidget.cpp
    src/CameraWidget.cpp
    src/CamerasPage.cpp
    src/ROS2EntitiesPage.cpp
    src/GenericPage.cpp
)

set(HEADERS
    src/Constants.h
    src/LoopGui.h
    src/NavigationBar.h
    src/SubsystemWidget.h
    src/CameraWidget.h
    src/CamerasPage.h
    src/ROS2EntitiesPage.h
    src/GenericPage.h
)

# Create executable
add_executable(LoopGui ${SOURCES} ${HEADERS})

# Link Qt libraries
target_link_libraries(LoopGui
    Qt6::Core
    Qt6::Widgets
    Qt6::Network
    Qt6::WebSockets
    Qt6::Multimedia
    Qt6::MultimediaWidgets
)

# Include directories
target_include_directories(LoopGui PRIVATE src)