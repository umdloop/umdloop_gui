"use client";

import React, { useEffect, useRef } from "react";

export default function WebRtcCameraVideo({
  stream,
  alt,
  style,
  placeholderStyle,
  placeholderText = "Waiting for video",
  videoRef,
  ...videoProps
}) {
  const internalRef = useRef(null);

  useEffect(() => {
    const element = internalRef.current;
    if (!element) return;
    element.srcObject = stream || null;
  }, [stream]);

  const setRefs = (node) => {
    internalRef.current = node;
    if (typeof videoRef === "function") {
      videoRef(node);
    }
  };

  if (!stream) {
    return (
      <div
        role="img"
        aria-label={alt}
        {...videoProps}
        style={{
          ...style,
          ...placeholderStyle,
          objectFit: undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#bbb",
          fontWeight: 800,
        }}
      >
        {placeholderText}
      </div>
    );
  }

  return (
    <video
      ref={setRefs}
      autoPlay
      playsInline
      muted
      style={style}
      aria-label={alt}
      {...videoProps}
    />
  );
}
