/**
 * Live Raman Spectrum Viewer with WebGL accelerated bar rendering
 *
 * X-axis: Photodiode ID (0-3647)
 * Y-axis: Light Intensity (0-255)
 *
 * Install: npm install webgl-plot
 *
 * Usage:
 *   <RamanPlot wsUrl="ws://localhost:5000/ws/spectrum" />
 *   <RamanPlot testMode />  // runs with simulated data
 */
import React, { useRef, useEffect, useCallback, useState } from "react";

const NUM_PD = 3648;

function generateTestSpectrum() {
  const raw = new Array(NUM_PD);
  const processed = new Array(NUM_PD);
  const wavenumbers = new Array(NUM_PD);
  const ids = new Array(NUM_PD);

  const x = new Array(NUM_PD);
  for (let i = 0; i < NUM_PD; i += 1) {
    x[i] = i;
    ids[i] = i;
    wavenumbers[i] = 200 + (i / NUM_PD) * 3300;
  }

  const peaks = x.map(
    (xi) =>
      Math.exp(-((xi - 1000) ** 2) / 2000) +
      Math.exp(-((xi - 2000) ** 2) / 3000)
  );

  for (let i = 0; i < NUM_PD; i += 1) {
    const noise = (Math.random() - 0.5) * 0.04;
    raw[i] = Math.max(0, Math.min(255, (peaks[i] + noise) * 200));
    processed[i] = Math.max(0, peaks[i] + Math.random() * 0.02);
  }

  return {
    photodiode_ids: ids,
    wavenumbers,
    raw_intensities: raw,
    processed_intensities: processed,
    peak_positions: [1000, 2000],
    peak_intensities: [1.0, 0.8],
  };
}

const RamanPlot = ({
  wsUrl = "ws://localhost:5000/ws/spectrum",
  width = 900,
  height = 400,
  testMode = false,
}) => {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const animRef = useRef(0);
  const latestData = useRef(null);

  const [connected, setConnected] = useState(false);
  const [peakInfo, setPeakInfo] = useState("");

  const drawBars = useCallback((canvas, data) => {
    if (!canvas || !data || !data.raw_intensities) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numBars = data.raw_intensities.length;
    const barWidth = Math.max(1, canvas.width / numBars);

    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let maxVal = 1;
    for (let i = 0; i < numBars; i += 1) {
      if (data.raw_intensities[i] > maxVal) {
        maxVal = data.raw_intensities[i];
      }
    }

    ctx.fillStyle = "#00ff64";
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < numBars; i += 1) {
      const normalized = data.raw_intensities[i] / Math.max(maxVal, 255);
      const barHeight = normalized * canvas.height;
      const x = (i / numBars) * canvas.width;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    }

    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    const gridSteps = 10;
    for (let i = 0; i <= gridSteps; i += 1) {
      const x = (i / gridSteps) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i <= 4; i += 1) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const animate = () => {
      if (latestData.current) {
        drawBars(canvas, latestData.current);
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawBars]);

  const updatePlotData = useCallback((data) => {
    latestData.current = data;

    if (data.peak_positions.length > 0) {
      const peakStr = data.peak_positions
        .slice(0, 6)
        .map((pos) => `${pos.toFixed(0)} cm^-1`)
        .join("  |  ");
      setPeakInfo(peakStr);
    }
  }, []);

  useEffect(() => {
    if (!testMode) return undefined;
    setConnected(true);

    const interval = setInterval(() => {
      updatePlotData(generateTestSpectrum());
    }, 200);

    return () => clearInterval(interval);
  }, [testMode, updatePlotData]);

  useEffect(() => {
    if (testMode) return undefined;

    let ws;
    let reconnectTimeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updatePlotData(data);
        } catch (error) {
          console.error("Failed to parse spectrum data:", error);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsUrl, testMode, updatePlotData]);

  return (
    <div style={{ position: "relative", display: "inline-block", fontFamily: "monospace" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          background: "#1a1a2e",
          color: "#eee",
          fontSize: 12,
          borderRadius: "6px 6px 0 0",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "#4caf50" : "#f44336",
              marginRight: 6,
            }}
          />
          {connected ? (testMode ? "TEST MODE" : "LIVE") : "DISCONNECTED"}
        </span>
        <span style={{ color: "#aaa", fontSize: 11 }}>{peakInfo}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width,
          height,
          background: "#0a0a1a",
          display: "block",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "3px 10px",
          fontSize: 11,
          color: "#666",
          background: "#111",
        }}
      >
        <span>0</span>
        <span>&larr; Photodiode ID &rarr;</span>
        <span>{NUM_PD}</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "4px 10px",
          fontSize: 11,
          color: "#888",
          background: "#111",
          borderRadius: "0 0 6px 6px",
        }}
      >
        <span>
          <span style={{ color: "rgba(0,255,100,1)" }}>━━</span> Raw Intensity (0-255)
        </span>
        <span style={{ marginLeft: "auto", color: "#555" }}>
          Y: Light Intensity (a.u.)
        </span>
      </div>
    </div>
  );
};

export default RamanPlot;
