#!/usr/bin/env python3
"""
Python backend for live Raman spectrum visualization.
Pipeline: CAN frames (via radio) → RamanSPy preprocessing → WebSocket → React

Dependencies:
    pip install fastapi uvicorn websockets ramanspy numpy
"""
import asyncio
import json
import struct
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import ramanspy
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Configuration
NUM_PHOTODIODES = 3648  # Number of photodiodes in your PDA
SEND_RATE_HZ = 5       # How often to push to React frontend

# RamanSPy preprocessing pipeline
PIPELINE = ramanspy.preprocessing.Pipeline([
    ramanspy.preprocessing.misc.Cropper(region=(400, 3200)),
    ramanspy.preprocessing.despike.WhitakerHayes(),
    ramanspy.preprocessing.denoise.SavGol(window_length=9, polyorder=3),
    ramanspy.preprocessing.baseline.ASPLS(),
    ramanspy.preprocessing.normalise.MinMax(),
])

# Pixel-to-wavenumber calibration
def pixel_to_wavenumber(num_pixels: int) -> np.ndarray:
    """
    Convert photodiode pixel indices to Raman shift (cm^-1).

    TODO: Replace with your actual calibration.
    Options:
      - Polynomial fit: wn = a0 + a1*px + a2*px^2 + a3*px^3
      - Lookup table from calibration file
    """
    # Placeholder: linear mapping from pixel index to wavenumber
    return np.linspace(200, 3500, num_pixels)


WAVENUMBER_AXIS = pixel_to_wavenumber(NUM_PHOTODIODES)

# CAN frame decoder
class PDADecoder:
    """
    Reassembles CAN frames from the PDA into a complete pixel intensity array.

    TODO: Adapt to your custom CAN protocol. Typical approaches:
      - Multi-frame burst: N frames × 8 bytes = enough for all pixels
      - CAN FD: 64-byte payloads, fewer frames needed
      - Sequence number in first byte for ordering
    """

    def __init__(self, num_pixels: int):
        self.num_pixels = num_pixels
        self.buffer = np.zeros(num_pixels, dtype=np.float64)
        self.received_count = 0
        # How many 16-bit pixel values fit per 8-byte CAN frame
        # (1 byte sequence + 7 bytes data = 3 x uint16 + 1 byte padding)
        self.pixels_per_frame = 3

    def feed_frame(self, can_data: bytes) -> Optional[np.ndarray]:
        """
        Feed a single CAN frame. Returns the full pixel array when complete.

        Expected frame format (adapt to your protocol):
          byte 0:    sequence number (0, 1, 2, ...)
          bytes 1-6: 3x uint16 pixel values (little-endian)
          byte 7:    padding / flags
        """
        if len(can_data) < 7:
            return None

        seq = can_data[0]
        start_idx = seq * self.pixels_per_frame

        for i in range(self.pixels_per_frame):
            px_idx = start_idx + i
            if px_idx < self.num_pixels:
                offset = 1 + i * 2
                value = struct.unpack_from('<H', can_data, offset)[0]
                self.buffer[px_idx] = float(value)
                self.received_count += 1

        # Check if we have all pixels
        if self.received_count >= self.num_pixels:
            result = self.buffer.copy()
            self.buffer[:] = 0
            self.received_count = 0
            return result

        return None

# Shared state
class SpectrumState:
    def __init__(self):
        self.raw_intensities: Optional[np.ndarray] = None
        self.processed_intensities: Optional[np.ndarray] = None
        self.processed_wavenumbers: Optional[np.ndarray] = None
        self.peak_positions: list = []
        self.peak_intensities: list = []
        self.lock = asyncio.Lock()

    async def update(self, raw_pixels: np.ndarray):
        """Run RamanSPy preprocessing and store results."""
        # Wrap raw data in a RamanSPy Spectrum
        spectrum = ramanspy.Spectrum(raw_pixels, WAVENUMBER_AXIS)

        # Apply preprocessing pipeline
        processed = PIPELINE.apply(spectrum)

        # Detect peaks
        try:
            from scipy.signal import find_peaks
            peaks_idx, _ = find_peaks(
                processed.spectral_data,
                prominence=0.05,
                width=2
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
        """Build JSON payload for the React frontend."""
        async with self.lock:
            if self.processed_intensities is None:
                return None
            return {
                # X-axis: photodiode IDs (raw) and wavenumbers (processed)
                "photodiode_ids": list(range(NUM_PHOTODIODES)),
                "wavenumbers": self.processed_wavenumbers.tolist(),
                # Y-axis: intensities
                "raw_intensities": self.raw_intensities.tolist(),
                "processed_intensities": self.processed_intensities.tolist(),
                # Peaks
                "peak_positions": self.peak_positions,
                "peak_intensities": self.peak_intensities,
            }


state = SpectrumState()
decoder = PDADecoder(NUM_PHOTODIODES)
radio_task = None

# Radio / serial ingestion (background task)
async def radio_ingestion_loop():
    """
    Read CAN frames from the radio link and feed them to the decoder.

    TODO: Replace with your actual radio/serial interface.
    Options:
      - Serial: import serial; ser = serial.Serial('/dev/ttyUSB0', 115200)
      - SocketCAN: import can; bus = can.interface.Bus(channel='can0')
      - UDP: asyncio datagram protocol
    """
    while True:
        # --- SIMULATED DATA for testing ---
        # Generate a fake spectrum with two Gaussian peaks
        x = np.linspace(0, 3647, NUM_PHOTODIODES)
        peaks = (
            np.exp(-(x-1000)**2/2000) +
            np.exp(-(x-2000)**2/3000)
        )
        noise = np.random.normal(0, 0.02, len(x))
        fake_pixels = (peaks + noise) * 200  # Scale to 0-200 range
        fake_pixels = np.clip(fake_pixels, 0, 255)

        await state.update(fake_pixels)
        await asyncio.sleep(1.0 / SEND_RATE_HZ)

        # --- REAL IMPLEMENTATION would look like: ---
        # frame = await read_can_frame_from_radio()
        # pixel_array = decoder.feed_frame(frame.data)
        # if pixel_array is not None:
        #     await state.update(pixel_array)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global radio_task
    radio_task = asyncio.create_task(radio_ingestion_loop())
    yield
    # Shutdown
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


# WebSocket endpoint for React frontend
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

# REST endpoint for one-shot spectrum fetch
@app.get("/api/spectrum")
async def get_spectrum():
    payload = await state.get_payload()
    if payload:
        return payload
    return {"error": "No spectrum data available"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("raman_backend:app", host="127.0.0.1", port=5000, reload=True)