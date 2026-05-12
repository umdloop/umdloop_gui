"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { MISSION_SYNC_URL } from "../config";
import { resolveRoleUrl } from "../lib/mission-mapping";

function IdlePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const monitor = searchParams.get("monitor");
  const wsRef = useRef(null);

  useEffect(() => {
    if (!monitor) return;

    const ws = new WebSocket(MISSION_SYNC_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "set-mission" && data.mission) {
          const url = resolveRoleUrl(data.mission, monitor);
          router.replace(url);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Attempt reconnect after 2 seconds
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 2000);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [monitor, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1a1a1a",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/loop.png"
        alt="UMD Loop"
        style={{ maxWidth: "300px", maxHeight: "300px" }}
      />
    </div>
  );
}

export default function IdlePage() {
  return (
    <Suspense fallback={null}>
      <IdlePageContent />
    </Suspense>
  );
}
