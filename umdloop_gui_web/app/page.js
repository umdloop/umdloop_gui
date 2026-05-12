"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { MISSION_SYNC_URL } from "./config";
import { MISSIONS } from "./lib/mission-mapping";

const MISSION_LABELS = {
  delivery: "Delivery Mission",
  "equipment-servicing": "Equipment Servicing Mission",
  "autonomous-navigation": "Autonomous Navigation Mission",
  science: "Science Mission",
};

function RootPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const monitor = searchParams.get("monitor");

  useEffect(() => {
    if (monitor && monitor !== "slot-3") {
      router.replace(`/idle?monitor=${encodeURIComponent(monitor)}`);
    }
  }, [monitor, router]);

  // If not slot-3 and not yet redirected, show nothing
  if (monitor !== "slot-3") {
    return null;
  }

  function handleMissionSelect(mission) {
    // Send set-mission to Mission Sync Service
    const ws = new WebSocket(MISSION_SYNC_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "set-mission", mission }));
      ws.close();
    };
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "1.5rem",
        background: "#1a1a1a",
      }}
    >
      <h1 style={{ color: "#fff", marginBottom: "2rem" }}>Select Mission</h1>
      {MISSIONS.map((mission) => (
        <button
          key={mission}
          onClick={() => handleMissionSelect(mission)}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.25rem",
            borderRadius: "0.5rem",
            border: "2px solid #444",
            background: "#2a2a2a",
            color: "#fff",
            cursor: "pointer",
            minWidth: "320px",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#3a3a3a")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#2a2a2a")}
        >
          {MISSION_LABELS[mission]}
        </button>
      ))}
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RootPageContent />
    </Suspense>
  );
}
