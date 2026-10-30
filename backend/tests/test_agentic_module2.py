# MODULE: Agentic Classification and Assignment (Module 2) - this file belongs to the code for this module.
# Unit tests for Module 2 agentic classification, equipment matcher, similar fault cluster analysis, priority computation, and job queue.

import pytest
from backend.app.agentic.priority_agent import compute_priority
from backend.app.agentic.schemas import ClassificationOutput, ScoreBreakdown, CandidateEvaluation
from backend.app.agentic.classification_agent import get_routing_category


def test_priority_matrix_computation():
    """Tests deterministic compute_priority formula calculation."""
    # Base LOW hint, 1 user -> LOW (1)
    res1 = compute_priority(priority_hint="LOW", affected_users_count=1, location="Hostel 1")
    assert res1["priority"] == "LOW"

    # Base MEDIUM hint, 6 users (high impact >= 5) -> HIGH (3)
    res2 = compute_priority(priority_hint="MEDIUM", affected_users_count=6, location="Hostel 1")
    assert res2["priority"] == "HIGH"

    # Base LOW hint, 25 users (critical impact >= 20) -> CRITICAL (4)
    res3 = compute_priority(priority_hint="LOW", affected_users_count=25, location="Hostel 1")
    assert res3["priority"] == "CRITICAL"

    # Base HIGH hint, 1 user, recurring fault -> CRITICAL (4)
    res4 = compute_priority(priority_hint="HIGH", affected_users_count=1, location="Hostel 1", recurring=True)
    assert res4["priority"] == "CRITICAL"


def test_routing_category_confidence_threshold():
    """Tests get_routing_category confidence threshold behavior."""
    # High confidence (0.85 >= 0.75) -> returns ai_category
    complaint_high = {
        "problem_type": "WIFI_PROBLEM",
        "ai_category": "LAN_PORT_BROKEN",
        "ai_confidence": 0.85
    }
    assert get_routing_category(complaint_high) == "LAN_PORT_BROKEN"

    # Low confidence (0.50 < 0.75) -> falls back to student's problem_type
    complaint_low = {
        "problem_type": "WIFI_PROBLEM",
        "ai_category": "LAN_PORT_BROKEN",
        "ai_confidence": 0.50
    }
    assert get_routing_category(complaint_low) == "WIFI_PROBLEM"


def test_classification_schema_validation():
    """Tests Pydantic validation and clamping of classification outputs."""
    out = ClassificationOutput(
        problem_type="WIFI_PROBLEM",
        confidence=0.9,
        priority_hint="high",
        summary="Wi-Fi AP disconnections in block A"
    )
    assert out.priority_hint == "HIGH"
    assert out.confidence == 0.9


def test_to_query_ids_expansion():
    """Tests to_query_ids expansion and deduplication of ObjectId and strings."""
    from backend.app.agentic.equipment_matcher import to_query_ids
    from bson import ObjectId

    hex_id = "65f1234567890abcdef12345"
    expanded = to_query_ids([hex_id, "non_object_id"])
    assert hex_id in expanded
    assert ObjectId(hex_id) in expanded
    assert "non_object_id" in expanded


@pytest.mark.asyncio
async def test_equipment_matcher_objectid_resolution(monkeypatch):
    """Tests that find_affected_equipment correctly matches assets having BSON ObjectId _ids."""
    from bson import ObjectId
    from backend.app.agentic.equipment_matcher import find_affected_equipment
    import backend.app.agentic.equipment_matcher as em

    hostel_oid = ObjectId("65f1234567890abcdef12301")
    room_oid = ObjectId("65f1234567890abcdef12302")
    switch_oid = ObjectId("65f1234567890abcdef12303")

    class FakeCursor:
        def __init__(self, items):
            self.items = items
        def __aiter__(self):
            self._iter = iter(self.items)
            return self
        async def __anext__(self):
            try:
                return next(self._iter)
            except StopIteration:
                raise StopAsyncIteration
        def limit(self, n):
            self.items = self.items[:n]
            return self

    class FakeDB:
        class Locations:
            def find(self, query):
                if "$or" in query:
                    return FakeCursor([{"_id": hostel_oid, "name": "SV Patel Hostel", "code": "SVPH"}])
                if "parent_id" in query:
                    return FakeCursor([{"_id": room_oid, "name": "Room 214", "code": "SVPH-R214", "parent_id": str(hostel_oid)}])
                return FakeCursor([])

        class SwitchPorts:
            def find(self, query):
                return FakeCursor([{"_id": ObjectId(), "switch_id": str(switch_oid), "location_id": str(room_oid)}])

        class Assets:
            def find(self, query):
                if "_id" in query and "$in" in query["_id"]:
                    in_list = query["_id"]["$in"]
                    if switch_oid in in_list:
                        return FakeCursor([{"_id": switch_oid, "category": "SWITCH", "status": "IN_USE"}])
                return FakeCursor([])

        na_locations = Locations()
        na_switch_ports = SwitchPorts()
        na_assets = Assets()

    monkeypatch.setattr(em, "get_database", lambda: FakeDB())

    res = await find_affected_equipment(
        location_name="sv_patel",
        problem_category="LAN_PROBLEM",
        address_room="Room 214"
    )
    assert len(res) == 1
    assert res[0] == str(switch_oid)
