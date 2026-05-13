#pragma once

#include <gst/gst.h>
#include <string>
#include <iostream>

struct PlatformSpecifics {
    std::string source;
    std::string encoder;
    std::string converter;
};

class PlatformDetect {
public:
    static PlatformSpecifics getPlatformSpecifics() {
        PlatformSpecifics specs;
        
        specs.source = "v4l2src";
        specs.encoder = "x264enc";
        specs.converter = "videoconvert";

        GstElementFactory* factory = nullptr;

        factory = gst_element_factory_find("avfvideosrc");
        if (factory) {
            specs.source = "avfvideosrc";
            gst_object_unref(factory);
            
            factory = gst_element_factory_find("vtenc_h264");
            if (factory) {
                specs.encoder = "vtenc_h264";
                gst_object_unref(factory);
            }
            return specs;
        }

        factory = gst_element_factory_find("nvv4l2h264enc");
        if (factory) {
            specs.encoder = "nvv4l2h264enc";
            specs.converter = "nvvidconv";
            gst_object_unref(factory);
        }

        return specs;
    }
};
