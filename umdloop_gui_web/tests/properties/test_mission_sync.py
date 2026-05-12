"""Property-based tests for the Mission Sync Service.

Tests Properties 3, 4, and 5 from the gui-reorganization design document.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from starlette.testclient import TestClient

from backend.mission_sync.state import (
    VALID_MISSIONS,
    MissionState,
    load_state,
    save_state,
)
from backend.mission_sync.app import app

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

valid_mission_st = st.sampled_from(sorted(VALID_MISSIONS))
mission_state_st = st.one_of(st.none(), valid_mission_st).map(
    lambda m: MissionState(active_mission=m)
)

# Strings that are NOT valid mission identifiers
invalid_mission_st = st.text(min_size=0, max_size=100).filter(
    lambda s: s not in VALID_MISSIONS
)


def _reset_app_state(active_mission=None):
    """Reset the app module state and point persistence to a temp file."""
    import backend.mission_sync.app as app_module

    tmpdir = tempfile.mkdtemp()
    app_module._state_file_path = Path(tmpdir) / "mission-state.json"
    app_module._state = MissionState(active_mission=active_mission)
    app_module._clients.clear()


# ---------------------------------------------------------------------------
# Property 5: Mission state serialization round trip
# **Feature: gui-reorganization, Property 5: Mission state serialization round trip**
# **Validates: Requirements 7.5**
# ---------------------------------------------------------------------------


class TestMissionStateRoundTrip:
    """For any valid mission state (including null), serializing to JSON and
    deserializing SHALL produce a value equal to the original."""

    @settings(max_examples=100)
    @given(state=mission_state_st)
    def test_json_round_trip(self, state: MissionState) -> None:
        """Serialize then deserialize produces equal state."""
        serialized = state.model_dump_json()
        recovered = MissionState.model_validate_json(serialized)
        assert recovered == state

    @settings(max_examples=100)
    @given(state=mission_state_st)
    def test_file_round_trip(self, state: MissionState) -> None:
        """Write to disk then read back produces equal state."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "mission-state.json"
            save_state(state, path)
            recovered = load_state(path)
            assert recovered == state


# ---------------------------------------------------------------------------
# Property 4: Mission Sync rejects invalid identifiers
# **Feature: gui-reorganization, Property 4: Mission Sync rejects invalid identifiers**
# **Validates: Requirements 7.3**
# ---------------------------------------------------------------------------


class TestMissionSyncRejectsInvalid:
    """For any string that is not a valid mission identifier, sending it as a
    set-mission message SHALL result in an error response, and the active
    mission SHALL remain unchanged."""

    @settings(max_examples=100)
    @given(invalid_id=invalid_mission_st)
    def test_invalid_mission_rejected_by_model(self, invalid_id: str) -> None:
        """MissionState rejects invalid identifiers."""
        with pytest.raises(Exception):
            MissionState(active_mission=invalid_id)

    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_invalid_mission_via_websocket(self, data) -> None:
        """WebSocket endpoint rejects invalid identifiers and leaves state unchanged."""
        import backend.mission_sync.app as app_module

        initial_mission = data.draw(st.one_of(st.none(), valid_mission_st))
        invalid_id = data.draw(invalid_mission_st)

        _reset_app_state(active_mission=initial_mission)

        client = TestClient(app)

        with client.websocket_connect("/mission-sync") as ws:
            # Receive initial state message
            initial_msg = ws.receive_json()
            assert initial_msg["type"] == "set-mission"
            assert initial_msg["mission"] == initial_mission

            # Send invalid mission
            ws.send_text(json.dumps({"type": "set-mission", "mission": invalid_id}))

            # Should receive error
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "Invalid mission identifier" in response["message"]

        # State should be unchanged
        assert app_module._state.active_mission == initial_mission


# ---------------------------------------------------------------------------
# Property 3: Mission Sync broadcast consistency
# **Feature: gui-reorganization, Property 3: Mission Sync broadcast consistency**
# **Validates: Requirements 7.1, 7.2**
# ---------------------------------------------------------------------------


class TestMissionSyncBroadcast:
    """For any valid Mission identifier sent as a set-mission message, every
    connected WebSocket client SHALL receive that same identifier as a
    set-mission event, and a newly connecting client SHALL receive the most
    recently set mission as its first message."""

    @settings(max_examples=100)
    @given(mission=valid_mission_st)
    def test_broadcast_to_all_clients(self, mission: str) -> None:
        """All connected clients receive the broadcast."""
        _reset_app_state(active_mission=None)

        client = TestClient(app)

        with client.websocket_connect("/mission-sync") as ws1:
            # Drain initial state
            ws1.receive_json()

            with client.websocket_connect("/mission-sync") as ws2:
                # Drain initial state for ws2
                ws2.receive_json()

                # ws1 sends set-mission
                ws1.send_text(json.dumps({"type": "set-mission", "mission": mission}))

                # Both clients should receive the broadcast
                msg1 = ws1.receive_json()
                assert msg1 == {"type": "set-mission", "mission": mission}

                msg2 = ws2.receive_json()
                assert msg2 == {"type": "set-mission", "mission": mission}

    @settings(max_examples=100)
    @given(mission=valid_mission_st)
    def test_new_client_receives_current_state(self, mission: str) -> None:
        """A newly connecting client receives the most recently set mission."""
        _reset_app_state(active_mission=mission)

        client = TestClient(app)

        with client.websocket_connect("/mission-sync") as ws:
            msg = ws.receive_json()
            assert msg == {"type": "set-mission", "mission": mission}
