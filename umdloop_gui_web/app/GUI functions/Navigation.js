"use client";

import React, { useEffect, useState } from "react";

export default function Navigation({ selectedNavItem }) {
  const [running, setRunning] = useState(false);
  const [pid, setPid] = useState(null);
  const [error, setError] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [navMode, setNavMode] = useState("GNSS");
  const [pathPlanStatus, setPathPlanStatus] = useState("");

  const fetchStatus = async () => {
    try {
      setError("");
      const res = await fetch("http://127.0.0.1:5000/object-detection/status");
      const data = await res.json();
      setRunning(Boolean(data.running));
      setPid(data.pid ?? null);
    } catch (_) {
      setError("Backend unreachable");
      setRunning(false);
      setPid(null);
    }
  };

  const startDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/start", { method: "POST" });
      await fetchStatus();
    } catch (_) {
      setError("Failed to start");
    }
  };

  const stopDetection = async () => {
    try {
      setError("");
      await fetch("http://127.0.0.1:5000/object-detection/stop", { method: "POST" });
      await fetchStatus();
    } catch (_) {
      setError("Failed to stop");
    }
  };

  const onPathPlan = async () => {
    console.log("Path plan clicked", { latitude, longitude, navMode });
    try {
      setError("");
      setPathPlanStatus("Sending...");

      const res = await fetch("http://127.0.0.1:5000/navigation/path-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          position_tolerance: 0.0,
          mode: navMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setPathPlanStatus("");
        setError(data.error || data.message || "Path plan failed");
        return;
      }

      setPathPlanStatus(data.message || "Request sent");
    } catch (_) {
      setPathPlanStatus("");
      setError("Backend unreachable");
    }
  };

  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return undefined;

    fetchStatus();
    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, [selectedNavItem]);

  useEffect(() => {
    if (selectedNavItem !== "Object Detection") return;
    startDetection();
  }, [selectedNavItem]);

  return (
    <div>
      <h1>{selectedNavItem} - Navigation Mode</h1>

      {selectedNavItem === "Object Detection" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "fit-content",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                fontWeight: 800,
                background: running ? "#1f7a1f" : "#8a1f1f",
              }}
            >
              {running ? "RUNNING ✅" : "STOPPED ❌"}
            </div>

            <div style={{ opacity: 0.9 }}>
              PID: <span style={{ fontWeight: 700 }}>{pid ?? "—"}</span>
            </div>

            {error && <div style={{ color: "#ffb3b3", fontWeight: 700 }}>{error}</div>}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={startDetection} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
              Start
            </button>
            <button onClick={stopDetection} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
              Stop
            </button>
            <button onClick={fetchStatus} style={{ cursor: "pointer", padding: "10px 16px", borderRadius: "9999px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", fontWeight: 800 }}>
              Refresh
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <h2>Object Detection Stream</h2>
            <img src="http://127.0.0.1:5000/object-detection/stream/0" alt="Object Detection Stream" style={{ width: "640px", height: "480px" }} />
          </div>
        </div>
      )}

      {selectedNavItem === "Control Panel" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "14px",
              border: "2px solid #1f1e1eff",
              background: "#2b2b2b",
              color: "white",
              width: "520px",
              textAlign: "left",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Control Panel</h2>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Latitude</label>
                <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 38.4239116" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", outline: "none" }} />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Longitude</label>
                <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. -110.7849055" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "2px solid #1f1e1eff", background: "#3d3d3d", color: "white", outline: "none" }} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Mode</div>

              {["GNSS", "Object Detection", "Aruco Tag"].map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    border: "2px solid #1f1e1eff",
                    background: navMode === opt ? "#262626ff" : "#3d3d3d",
                    cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  <input type="radio" name="navMode" value={opt} checked={navMode === opt} onChange={() => setNavMode(opt)} style={{ transform: "scale(1.2)" }} />
                  <span style={{ fontWeight: 800 }}>{opt}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 6, opacity: 0.9 }}>
              <button
                onClick={onPathPlan}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "9999px",
                  border: "2px solid #1f1e1eff",
                  background: "#530000ff",
                  color: "white",
                  fontWeight: 900,
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Path Plan
              </button>
              {pathPlanStatus ? <div style={{ marginTop: "10px", color: "#d8d8d8", fontWeight: 700 }}>{pathPlanStatus}</div> : null}
              {error ? <div style={{ marginTop: "6px", color: "#ffb3b3", fontWeight: 700 }}>{error}</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
