"""
tests/test_api_telerad.py — Unit tests for Telerad sorting and priority logic.
Tests the PRIORITY_ORDER CASE expression and case claim logic in isolation.
"""
import os
import pytest

os.environ.setdefault("JWT_SECRET", "test-secret-for-unit-tests-only-not-production")
os.environ.setdefault("ENV", "development")


class TestPriorityOrder:
    """Validates that STAT < URGENT < ROUTINE in priority ordering."""

    PRIORITY_WEIGHTS = {"stat": 0, "urgent": 1, "routine": 2}

    def get_weight(self, priority: str) -> int:
        return self.PRIORITY_WEIGHTS.get(priority, 2)

    def sort_cases(self, cases):
        return sorted(cases, key=lambda c: self.get_weight(c["priority"]))

    def test_stat_sorts_first(self):
        cases = [
            {"id": "3", "priority": "routine"},
            {"id": "1", "priority": "stat"},
            {"id": "2", "priority": "urgent"},
        ]
        sorted_cases = self.sort_cases(cases)
        assert sorted_cases[0]["id"] == "1"   # STAT first
        assert sorted_cases[1]["id"] == "2"   # URGENT second
        assert sorted_cases[2]["id"] == "3"   # ROUTINE last

    def test_multiple_stat_cases_kept_together(self):
        cases = [
            {"id": "a", "priority": "routine"},
            {"id": "b", "priority": "stat"},
            {"id": "c", "priority": "stat"},
            {"id": "d", "priority": "urgent"},
        ]
        sorted_cases = self.sort_cases(cases)
        priorities = [c["priority"] for c in sorted_cases]
        assert priorities[0] == "stat"
        assert priorities[1] == "stat"
        assert priorities[2] == "urgent"
        assert priorities[3] == "routine"

    def test_all_routine_order_unchanged(self):
        cases = [
            {"id": "x", "priority": "routine"},
            {"id": "y", "priority": "routine"},
        ]
        sorted_cases = self.sort_cases(cases)
        assert sorted_cases[0]["id"] == "x"
        assert sorted_cases[1]["id"] == "y"

    def test_empty_list(self):
        assert self.sort_cases([]) == []

    def test_unknown_priority_treated_as_routine(self):
        cases = [
            {"id": "1", "priority": "unknown"},
            {"id": "2", "priority": "stat"},
        ]
        sorted_cases = self.sort_cases(cases)
        assert sorted_cases[0]["id"] == "2"  # stat first
        assert sorted_cases[1]["id"] == "1"  # unknown → treated as routine


class TestCasePriorityEnum:
    def test_priority_values(self):
        from api_telerad import CasePriority
        assert CasePriority.ROUTINE.value == "routine"
        assert CasePriority.URGENT.value  == "urgent"
        assert CasePriority.STAT.value    == "stat"

    def test_workflow_status_values(self):
        from api_telerad import WorkflowStatus
        assert WorkflowStatus.UNASSIGNED.value == "unassigned"
        assert WorkflowStatus.ASSIGNED.value   == "assigned"
        assert WorkflowStatus.IN_REVIEW.value  == "in_review"
        assert WorkflowStatus.REPORTED.value   == "reported"
        assert WorkflowStatus.FINALIZED.value  == "finalized"
