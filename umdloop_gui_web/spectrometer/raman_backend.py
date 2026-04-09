#!/usr/bin/env python3
"""
Python backend for live Raman spectrum visualization.
Pipeline: CAN frames (via radio) -> RamanSPy preprocessing -> WebSocket -> React
"""

import asyncio
import struct
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import ramanspy
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

NUM_PHOTODIODES = 3648
SEND_RATE_HZ = 5

PIPELINE = ramanspy.preprocessing.Pipeline([
    ramanspy.preprocessing.misc.Cropper(region=(400, 3200)),
    ramanspy.preprocessing.despike.WhitakerHayes(),
    ramanspy.preprocessing.denoise.SavGol(window_length=9, polyorder=3),
    ramanspy.preprocessing.baseline.ASPLS(),
    ramanspy.preprocessing.normalise.MinMax(),
])


def pixel_to_wavenumber(num_pixels: int) -> np.ndarray:
    return np.linspace(200, 3500, num_pixels)


WAVENUMBER_AXIS = pixel_to_wavenumber(NUM_PHOTODIODES)


class PDADecoder:
    def __init__(self, num_pixels: int):
        self.num_pixels = num_pixels
        self.buffer = np.zeros(num_pixels, dtype=np.float64)
        self.received_count = 0
        self.pixels_per_frame = 3

    def feed_frame(self, can_data: bytes) -> Optional[np.ndarray]:
        if len(can_data) < 7:
            return None

        seq = can_data[0]
        start_idx = seq * self.pixels_per_frame

        for i in range(self.pixels_per_frame):
            px_idx = start_idx + i
            if px_idx < self.num_pixels:
                offset = 1 + i * 2
                value = struct.unpack_from("<H", can_data, offset)[0]
                self.buffer[px_idx] = float(value)
                self.received_count += 1

        if self.received_count >= self.num_pixels:
            result = self.buffer.copy()
            self.buffer[:] = 0
            self.received_count = 0
            return result

        return None


class SpectrumState:
    def __init__(self):
        self.raw_intensities: Optional[np.ndarray] = None
        self.processed_intensities: Optional[np.ndarray] = None
        self.processed_wavenumbers: Optional[np.ndarray] = None
        self.peak_positions: list = []
        self.peak_intensities: list = []
        self.lock = asyncio.Lock()

    async def update(self, raw_pixels: np.ndarray):
        spectrum = ramanspy.Spectrum(raw_pixels, WAVENUMBER_AXIS)
        processed = PIPELINE.apply(spectrum)

        try:
            from scipy.signal import find_peaks

            peaks_idx, _ = find_peaks(
                processed.spectral_data,
                prominence=0.05,
                width=2,
            )
            p_pos = processed.spectral_axis[peaks_idx].tolist()
            p_int = processed.spectral_data[peaks_idx].tolist()
        except Exception:
            p_pos, p_int = [], []

        async with self.lock:
            self.raw_intensities = raw_pixels
            self.processed_intensities = processed.spectral_data
            self.processed_wavenumbers = processed.spectral_axis
            self.peak_positions = p_pos
            self.peak_intensities = p_int

    async def get_payload(self) -> Optional[dict]:
        async with self.lock:
            if self.processed_intensities is None:
                return None
            return {
                "photodiode_ids": list(range(NUM_PHOTODIODES)),
                "wavenumbers": self.processed_wavenumbers.tolist(),
                "raw_intensities": self.raw_intensities.tolist(),
                "processed_intensities": self.processed_intensities.tolist(),
                "peak_positions": self.peak_positions,
                "peak_intensities": self.peak_intensities,
            }


state = SpectrumState()
decoder = PDADecoder(NUM_PHOTODIODES)
radio_task = None


async def radio_ingestion_loop():
    while True:
        x = np.linspace(0, 3647, NUM_PHOTODIODES)
        peaks = (
            np.exp(-((x - 1000) ** 2) / 2000) +
            np.exp(-((x - 2000) ** 2) / 3000)
        )
        noise = np.random.normal(0, 0.02, len(x))
        fake_pixels = (peaks + noise) * 200
        fake_pixels = np.clip(fake_pixels, 0, 255)

        await state.update(fake_pixels)
        await asyncio.sleep(1.0 / SEND_RATE_HZ)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global radio_task
    radio_task = asyncio.create_task(radio_ingestion_loop())
    yield
    radio_task.cancel()
    try:
        await radio_task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/spectrum")
async def spectrum_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await state.get_payload()
            if payload:
                await websocket.send_json(payload)
            await asyncio.sleep(1.0 / SEND_RATE_HZ)
    except WebSocketDisconnect:
        pass


@app.get("/api/spectrum")
async def get_spectrum():
    payload = await state.get_payload()
    if payload:
        return payload
    return {"error": "No spectrum data available"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("raman_backend:app", host="127.0.0.1", port=5001, reload=True)
