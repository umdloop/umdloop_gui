"""Environment-based configuration for the Rover Backend.

Uses pydantic-settings to load values from environment variables.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Rover Backend configuration loaded from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 5000

    # MikroTik radio
    mikrotik_host: str = ""
    mikrotik_user: str = ""
    mikrotik_pass: str = ""
    mikrotik_endpoint: str = ""
    mikrotik_verify_tls: bool = False
    mikrotik_cache_ttl_sec: float = 1.5

    # Drone MAVLink
    umdloop_drone_mavlink_udp_port: int = 14550

    # ROS2
    rosbridge_host: str = "localhost"
    rosbridge_port: int = 9090

    model_config = {"env_prefix": "UMDLOOP_", "case_sensitive": False}


settings = Settings()
