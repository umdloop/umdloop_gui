"""Property-based tests for Pydantic model serialization round trips.

**Feature: gui-reorganization, Property 6: Pydantic model serialization round trip**
**Validates: Requirements 9.1, 9.2, 9.3**
"""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from backend.models.monitor_config import DisplayEntry, MonitorConfig
from backend.models.drone_telemetry import DroneTelemetryFrame
from backend.models.radio_status import RadioStatus
from backend.models.rover_position import RoverPosition
from backend.mission_sync.state import MissionState

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

monitor_slot_st = st.sampled_from(["slot-1", "slot-2", "slot-3", "slot-4", "slot-5"])
host_id_st = st.sampled_from(["cc1", "cc2"])

display_entry_st = st.builds(
    DisplayEntry,
    x_display_index=st.integers(min_value=0, max_value=10),
    monitor_slot=monitor_slot_st,
)

monitor_config_st = st.builds(
    MonitorConfig,
    host_id=host_id_st,
    displays=st.lists(display_entry_st, min_size=0, max_size=5),
)

valid_mission_st = st.sampled_from(
    ["delivery", "equipment-servicing", "autonomous-navigation", "science"]
)

mission_state_st = st.one_of(st.none(), valid_mission_st).map(
    lambda m: MissionState(active_mission=m)
)

drone_telemetry_st = st.builds(
    DroneTelemetryFrame,
    timestamp_ms=st.integers(min_value=0, max_value=2**53),
    battery_pct=st.one_of(st.none(), st.integers(min_value=0, max_value=100)),
    voltage_v=st.one_of(st.none(), st.floats(min_value=0.0, max_value=60.0, allow_nan=False, allow_infinity=False)),
    latitude=st.one_of(st.none(), st.floats(min_value=-90.0, max_value=90.0, allow_nan=False, allow_infinity=False)),
    longitude=st.one_of(st.none(), st.floats(min_value=-180.0, max_value=180.0, allow_nan=False, allow_infinity=False)),
    altitude_m=st.one_of(st.none(), st.floats(min_value=-1000.0, max_value=100000.0, allow_nan=False, allow_infinity=False)),
    heading_deg=st.one_of(st.none(), st.floats(min_value=0.0, max_value=360.0, allow_nan=False, allow_infinity=False)),
    airspeed_mps=st.one_of(st.none(), st.floats(min_value=0.0, max_value=500.0, allow_nan=False, allow_infinity=False)),
    groundspeed_mps=st.one_of(st.none(), st.floats(min_value=0.0, max_value=500.0, allow_nan=False, allow_infinity=False)),
    armed=st.one_of(st.none(), st.booleans()),
)

radio_status_st = st.builds(
    RadioStatus,
    connected=st.booleans(),
    quality_percent=st.integers(min_value=0, max_value=100),
    rssi_dbm=st.one_of(st.none(), st.floats(min_value=-120.0, max_value=0.0, allow_nan=False, allow_infinity=False)),
    tx_ccq=st.one_of(st.none(), st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
    rx_ccq=st.one_of(st.none(), st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
    source=st.sampled_from(["unavailable", "wifi registration table", "wireless registration table"]),
    error=st.one_of(st.none(), st.text(min_size=0, max_size=200)),
)

rover_position_st = st.builds(
    RoverPosition,
    ok=st.just(True),
    fix=st.booleans(),
    latitude=st.one_of(st.none(), st.floats(min_value=-90.0, max_value=90.0, allow_nan=False, allow_infinity=False)),
    longitude=st.one_of(st.none(), st.floats(min_value=-180.0, max_value=180.0, allow_nan=False, allow_infinity=False)),
)


# ---------------------------------------------------------------------------
# Property 6: Pydantic model serialization round trip
# **Feature: gui-reorganization, Property 6: Pydantic model serialization round trip**
# **Validates: Requirements 9.1, 9.2, 9.3**
# ---------------------------------------------------------------------------


class TestPydanticModelRoundTrip:
    """For any valid instance of any Pydantic model defined in the Rover Backend,
    calling model_dump_json() followed by model_validate_json() SHALL produce
    an instance equal to the original."""

    @settings(max_examples=100)
    @given(config=monitor_config_st)
    def test_monitor_config_round_trip(self, config: MonitorConfig) -> None:
        serialized = config.model_dump_json()
        recovered = MonitorConfig.model_validate_json(serialized)
        assert recovered == config

    @settings(max_examples=100)
    @given(state=mission_state_st)
    def test_mission_state_round_trip(self, state: MissionState) -> None:
        serialized = state.model_dump_json()
        recovered = MissionState.model_validate_json(serialized)
        assert recovered == state

    @settings(max_examples=100)
    @given(frame=drone_telemetry_st)
    def test_drone_telemetry_round_trip(self, frame: DroneTelemetryFrame) -> None:
        serialized = frame.model_dump_json()
        recovered = DroneTelemetryFrame.model_validate_json(serialized)
        assert recovered == frame

    @settings(max_examples=100)
    @given(status=radio_status_st)
    def test_radio_status_round_trip(self, status: RadioStatus) -> None:
        serialized = status.model_dump_json()
        recovered = RadioStatus.model_validate_json(serialized)
        assert recovered == status

    @settings(max_examples=100)
    @given(pos=rover_position_st)
    def test_rover_position_round_trip(self, pos: RoverPosition) -> None:
        serialized = pos.model_dump_json()
        recovered = RoverPosition.model_validate_json(serialized)
        assert recovered == pos


# ---------------------------------------------------------------------------
# Property 11: Drone telemetry serialization round trip
# **Feature: gui-reorganization, Property 11: Drone telemetry serialization round trip**
# **Validates: Requirements 16.5**
# ---------------------------------------------------------------------------


class TestDroneTelemetryRoundTrip:
    """For any valid drone telemetry frame, serializing to JSON and
    deserializing SHALL produce a frame with identical field values."""

    @settings(max_examples=100)
    @given(frame=drone_telemetry_st)
    def test_drone_telemetry_serialization_round_trip(self, frame: DroneTelemetryFrame) -> None:
        serialized = frame.model_dump_json()
        recovered = DroneTelemetryFrame.model_validate_json(serialized)
        assert recovered == frame
