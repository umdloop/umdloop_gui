#pragma once

#include <string>

struct CameraConfig {
    std::string devicePath; // live GStreamer device path (e.g. "/dev/video0"); updated each boot
    std::string usbPath;    // stable USB topology key (e.g. "usb:1-1.2"); used for cross-boot matching
    std::string name;
    std::string role;
    std::string format;
    int         width    = 1280;
    int         height   = 720;
    int         fps      = 30;
    std::string quality  = "medium"; // "low" | "medium" | "high" | "ultra"
    int         exposure = -1;       // -1 = auto; >= 0 = absolute exposure value (v4l2 only)
    bool        cropLeftHalf = false; // true for side-by-side stereo devices where only left view is streamed

    int computeBitrate() const {
        double bpp;
        if      (quality == "low")   bpp = 0.05;
        else if (quality == "high")  bpp = 0.20;
        else if (quality == "ultra") bpp = 0.35;
        else                         bpp = 0.10;
        int encodedWidth = cropLeftHalf ? width / 2 : width;
        return static_cast<int>(bpp * encodedWidth * height * fps);
    }
};
