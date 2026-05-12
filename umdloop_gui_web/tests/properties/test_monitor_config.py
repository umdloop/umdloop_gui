"""Property-based tests for Monitor Config serialization and schema validation.

**Feature: gui-reorganization, Property 12: Monitor config serialization round trip**
**Validates: Requirements 19.3**

**Feature: gui-reorganization, Property 13: Monitor config schema validation rejects invalid input**
**Validates: Requirements 19.2**
"""

from __future__ import annotations

import json
from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st
from jsonschema import validate, ValidationError

from backend.models.monitor_config import DisplayEntry, MonitorConfig

# ---------------------------------------------------------------------------
# Schema path
# ---------------------------------------------------------------------------

SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "deploy" / "config" / "monitors.schema.json"

with open(SCHEMA_PATH) as _f:
    MONITOR_SCHEMA = json.load(_f)

# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

VALID_SLOTS = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5"]
VALID_HOSTS = ["cc1", "cc2"]

monitor_slot_st = st.sampled_from(VALID_SLOTS)
host_id_st = st.sampled_from(VALID_HOSTS)

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


# ---------------------------------------------------------------------------
# Property 12: Monitor config serialization round trip
# **Feature: gui-reorganization, Property 12: Monitor config serialization round trip**
# **Validates: Requirements 19.3**
# ---------------------------------------------------------------------------


class TestMonitorConfigRoundTrip:
    """For any valid Monitor Config object, pretty-printing to JSON and
    parsing back SHALL produce an equal value."""

    @settings(max_examples=100)
    @given(config=monitor_config_st)
    def test_pretty_print_round_trip(self, config: MonitorConfig) -> None:
        # Pretty-print (indent=2) then parse back
        pretty_json = config.model_dump_json(indent=2)
        recovered = MonitorConfig.model_validate_json(pretty_json)
        assert recovered == config

    @settings(max_examples=100)
    @given(config=monitor_config_st)
    def test_json_schema_accepts_valid(self, config: MonitorConfig) -> None:
        """Valid configs produced by the Pydantic model must also pass
        the JSON Schema validation used by the kiosk launcher."""
        data = json.loads(config.model_dump_json())
        # Should not raise
        validate(instance=data, schema=MONITOR_SCHEMA)


# ---------------------------------------------------------------------------
# Property 13: Monitor config schema validation rejects invalid input
# **Feature: gui-reorganization, Property 13: Monitor config schema validation rejects invalid input**
# **Validates: Requirements 19.2**
# ---------------------------------------------------------------------------

# Strategy for invalid configs: mutate one aspect to make it invalid
invalid_host_st = st.text(min_size=1, max_size=10).filter(lambda s: s not in VALID_HOSTS)
invalid_slot_st = st.text(min_size=1, max_size=10).filter(lambda s: s not in VALID_SLOTS)


class TestMonitorConfigSchemaRejection:
    """For any JSON object that does not conform to the Monitor Config schema
    (missing required fields, wrong types, invalid slot identifiers),
    the parser SHALL reject it."""

    @settings(max_examples=100)
    @given(bad_host=invalid_host_st, displays=st.lists(display_entry_st, min_size=0, max_size=3))
    def test_rejects_invalid_host_id(self, bad_host: str, displays: list) -> None:
        data = {
            "host_id": bad_host,
            "displays": [json.loads(d.model_dump_json()) for d in displays],
        }
        rejected = False
        try:
            validate(instance=data, schema=MONITOR_SCHEMA)
        except ValidationError:
            rejected = True
        assert rejected, f"Schema should reject host_id={bad_host!r}"

    @settings(max_examples=100)
    @given(
        host_id=host_id_st,
        x_idx=st.integers(min_value=0, max_value=10),
        bad_slot=invalid_slot_st,
    )
    def test_rejects_invalid_monitor_slot(self, host_id: str, x_idx: int, bad_slot: str) -> None:
        data = {
            "host_id": host_id,
            "displays": [{"x_display_index": x_idx, "monitor_slot": bad_slot}],
        }
        rejected = False
        try:
            validate(instance=data, schema=MONITOR_SCHEMA)
        except ValidationError:
            rejected = True
        assert rejected, f"Schema should reject monitor_slot={bad_slot!r}"

    @settings(max_examples=100)
    @given(host_id=host_id_st)
    def test_rejects_missing_displays(self, host_id: str) -> None:
        data = {"host_id": host_id}
        rejected = False
        try:
            validate(instance=data, schema=MONITOR_SCHEMA)
        except ValidationError:
            rejected = True
        assert rejected, "Schema should reject missing 'displays' field"

    @settings(max_examples=100)
    @given(displays=st.lists(display_entry_st, min_size=0, max_size=3))
    def test_rejects_missing_host_id(self, displays: list) -> None:
        data = {"displays": [json.loads(d.model_dump_json()) for d in displays]}
        rejected = False
        try:
            validate(instance=data, schema=MONITOR_SCHEMA)
        except ValidationError:
            rejected = True
        assert rejected, "Schema should reject missing 'host_id' field"
