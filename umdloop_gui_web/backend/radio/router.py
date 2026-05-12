"""Radio status router — MikroTik radio link telemetry.

Ported from the prior Flask server.py.
"""

from __future__ import annotations

import base64
import json
import re
import ssl
import time
from typing import Optional
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_radio_status_cache: dict = {"timestamp": 0.0, "value": None}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MIKROTIK_DEFAULT_ENDPOINTS = [
    "interface/wireless/registration-table/print",
    "interface/wifi/registration-table/print",
]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _empty_radio_status(error: Optional[str] = None, source: str = "unavailable") -> dict:
    return {
        "connected": False,
        "quality_percent": 0,
        "rssi_dbm": None,
        "tx_ccq": None,
        "rx_ccq": None,
        "source": source,
        "error": error,
    }


def _parse_metric(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    if not match:
        return None
    return float(match.group(0))


def _source_label(endpoint: str) -> str:
    if "interface/wifi/" in endpoint:
        return "wifi registration table"
    if "interface/wireless/" in endpoint:
        return "wireless registration table"
    return endpoint


def _compute_quality_percent(
    rssi_dbm: Optional[float],
    tx_ccq: Optional[float],
    rx_ccq: Optional[float],
) -> int:
    components = []
    if rssi_dbm is not None:
        signal_score = ((rssi_dbm + 90.0) / 40.0) * 100.0
        components.append(_clamp(signal_score, 0.0, 100.0))
    if tx_ccq is not None:
        components.append(_clamp(tx_ccq, 0.0, 100.0))
    if rx_ccq is not None:
        components.append(_clamp(rx_ccq, 0.0, 100.0))
    if not components:
        return 0
    return int(round(sum(components) / len(components)))


def _normalize_registration_row(row: dict, endpoint: str) -> dict:
    tx_rx_ccq = row.get("tx/rx-ccq")
    tx_rx_parts = re.findall(r"-?\d+(?:\.\d+)?", str(tx_rx_ccq)) if tx_rx_ccq is not None else []

    tx_ccq = _parse_metric(row.get("tx-ccq"))
    rx_ccq = _parse_metric(row.get("rx-ccq"))
    if tx_ccq is None and tx_rx_parts:
        tx_ccq = float(tx_rx_parts[0])
    if rx_ccq is None and len(tx_rx_parts) > 1:
        rx_ccq = float(tx_rx_parts[1])

    rssi_dbm = None
    for key in ("signal-strength", "signal", "rx-signal", "signal-strength-ch0"):
        rssi_dbm = _parse_metric(row.get(key))
        if rssi_dbm is not None:
            break

    return {
        "connected": True,
        "quality_percent": _compute_quality_percent(rssi_dbm, tx_ccq, rx_ccq),
        "rssi_dbm": rssi_dbm,
        "tx_ccq": tx_ccq,
        "rx_ccq": rx_ccq,
        "source": _source_label(endpoint),
        "error": None,
    }


def _mikrotik_rest_post(endpoint: str):
    host = settings.mikrotik_host
    user = settings.mikrotik_user
    password = settings.mikrotik_pass

    if not host or not user or not password:
        raise RuntimeError("Set MIKROTIK_HOST, MIKROTIK_USER, and MIKROTIK_PASS to enable radio telemetry")

    url = f"https://{host}/rest/{endpoint.lstrip('/')}"
    req = urllib_request.Request(url, data=b"{}", method="POST")
    token = base64.b64encode(f"{user}:{password}".encode("utf-8")).decode("ascii")
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")

    ssl_context = None if settings.mikrotik_verify_tls else ssl._create_unverified_context()
    with urllib_request.urlopen(req, timeout=2.0, context=ssl_context) as response:
        payload = response.read().decode("utf-8")
        if not payload:
            return []
        return json.loads(payload)


def get_mikrotik_radio_status() -> dict:
    """Query MikroTik radio status with caching."""
    now = time.time()
    cached = _radio_status_cache["value"]
    if cached is not None and now - _radio_status_cache["timestamp"] < settings.mikrotik_cache_ttl_sec:
        return cached

    endpoints = (
        [settings.mikrotik_endpoint]
        if settings.mikrotik_endpoint
        else list(MIKROTIK_DEFAULT_ENDPOINTS)
    )
    errors = []

    for endpoint in endpoints:
        try:
            payload = _mikrotik_rest_post(endpoint)
        except urllib_error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            if exc.code == 404:
                errors.append(f"{endpoint}: not supported")
                continue
            status = _empty_radio_status(
                error=f"{endpoint}: HTTP {exc.code} {body}".strip(),
                source=_source_label(endpoint),
            )
            _radio_status_cache.update({"timestamp": now, "value": status})
            return status
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")
            continue

        if isinstance(payload, dict):
            rows = payload.get("data") or payload.get("ret") or [payload]
        elif isinstance(payload, list):
            rows = payload
        else:
            rows = []

        if rows:
            status = _normalize_registration_row(rows[0], endpoint)
        else:
            status = _empty_radio_status(
                error="No registered MikroTik peers found",
                source=_source_label(endpoint),
            )

        _radio_status_cache.update({"timestamp": now, "value": status})
        return status

    status = _empty_radio_status(
        error="; ".join(errors) if errors else "Unable to query MikroTik radio",
        source="unavailable",
    )
    _radio_status_cache.update({"timestamp": now, "value": status})
    return status


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.get("/radio/status")
async def radio_status():
    """Return current MikroTik radio link status."""
    status = get_mikrotik_radio_status()
    return JSONResponse({"ok": True, **status})
