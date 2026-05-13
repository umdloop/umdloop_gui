cmake_minimum_required(VERSION 3.16)
project(camera-stream LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_compile_definitions(GST_USE_UNSTABLE_API)

find_package(PkgConfig REQUIRED)
pkg_check_modules(GST REQUIRED gstreamer-1.0 gstreamer-webrtc-1.0 gstreamer-sdp-1.0 gstreamer-app-1.0 nice)
pkg_check_modules(LWS REQUIRED libwebsockets)

find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

set(SOURCES
    src/main.cpp
    src/CameraManager.cpp
    src/CameraPipeline.cpp
    src/MissionManager.cpp
    src/WsServer.cpp
)

add_executable(camera-stream ${SOURCES})

target_include_directories(camera-stream PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${GST_INCLUDE_DIRS}
    ${LWS_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIR}
    ${CMAKE_SOURCE_DIR}/third_party
)

target_link_directories(camera-stream PRIVATE
    ${GST_LIBRARY_DIRS}
    ${LWS_LIBRARY_DIRS}
)

target_link_libraries(camera-stream PRIVATE
    ${GST_LIBRARIES}
    ${LWS_LIBRARIES}
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)
