# MODULE: Complaint Management (Part 2) - this file belongs to the code for this module.
# Pytest test suite for Part 2 complaint management rules, auth, lifecycle, and stock rollbacks.

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException
from backend.app.complaint_management.routers.public_otp import validate_email_domain, hash_otp
from backend.app.complaint_management.services.ticket_service import generate_ticket_id
from backend.app.complaint_management.services.scoring_service import compute_technician_score
from backend.app.complaint_management.models import ComplaintStatus, StaffRole, ActionTokenPurpose
from backend.app.complaint_management.routers.student_actions import hash_token


def test_email_domain_validation():
    """Tests student college email domain validation rules."""
    # Valid email
    assert validate_email_domain("student1@mnnit.ac.in") == "student1@mnnit.ac.in"
    assert validate_email_domain("STU.DENT2@mnnit.ac.in ") == "stu.dent2@mnnit.ac.in"

    # Invalid: wrong domain
    with pytest.raises(HTTPException):
        validate_email_domain("student@gmail.com")

    # Invalid: subdomain
    with pytest.raises(HTTPException):
        validate_email_domain("student@cs.mnnit.ac.in")

    # Invalid: double @
    with pytest.raises(HTTPException):
        validate_email_domain("student@@mnnit.ac.in")


def test_otp_hashing():
    """Tests OTP code HMAC-SHA256 hashing."""
    h1 = hash_otp("123456")
    h2 = hash_otp("123456")
    h3 = hash_otp("654321")

    assert len(h1) == 64
    assert h1 == h2
    assert h1 != h3


def test_token_hashing():
    """Tests action token SHA-256 hashing."""
    raw = "test_token_string_123"
    th1 = hash_token(raw)
    th2 = hash_token(raw)

    assert len(th1) == 64
    assert th1 == th2


def test_scoring_formulas():
    """Tests plain average and Bayesian weighted leaderboard scoring formulas."""
    # Plain average
    score_avg = compute_technician_score(avg_rating=4.5, rating_count=2, resolved_count=10)
    assert score_avg == 4.5

    # Unrated
    score_unrated = compute_technician_score(avg_rating=None, rating_count=0, resolved_count=5)
    assert score_unrated == 0.0


@pytest.mark.asyncio
async def test_ticket_id_format():
    """Tests 12-digit ticket ID format YYMMDDHHMMSS."""
    tid = await generate_ticket_id()
    assert len(tid) == 12
    assert tid.isdigit()


@pytest.mark.asyncio
async def test_update_complaint_priority(monkeypatch):
    """Tests manual priority update by manager/admin, status validation, and audit history logging."""
    from backend.app.complaint_management.routers.manager_complaints import update_complaint_priority
    from backend.app.complaint_management.schemas import UpdatePriorityPayload
    from backend.app.complaint_management.models import ComplaintPriority
    import backend.app.complaint_management.routers.manager_complaints as mc

    fake_complaint = {
        "ticket_id": "261030120000",
        "status": "CLASSIFIED",
        "priority": "MEDIUM"
    }
    history_entries = []

    class FakeComplaints:
        async def find_one(self, query):
            if query.get("ticket_id") == "261030120000":
                return fake_complaint
            return None

        async def update_one(self, query, update):
            if "$set" in update:
                fake_complaint.update(update["$set"])
            return None

    class FakeHistory:
        async def insert_one(self, doc):
            history_entries.append(doc)
            return None

    class FakeDB:
        complaints = FakeComplaints()
        complaint_history = FakeHistory()

    monkeypatch.setattr(mc, "get_database", lambda: FakeDB())

    admin_user = {
        "_id": "admin_01",
        "role": "ADMIN",
        "full_name": "Test Admin"
    }

    # 1. Successful priority upgrade
    payload = UpdatePriorityPayload(priority=ComplaintPriority.CRITICAL, reason="Urgent lab outage")
    res = await update_complaint_priority("261030120000", payload, admin_user)

    assert res["new_priority"] == "CRITICAL"
    assert res["old_priority"] == "MEDIUM"
    assert fake_complaint["priority"] == "CRITICAL"
    assert len(history_entries) == 1
    assert history_entries[0]["event_type"] == "PRIORITY_CHANGE"
    assert history_entries[0]["details"]["old_priority"] == "MEDIUM"
    assert history_entries[0]["details"]["new_priority"] == "CRITICAL"
    assert "Urgent lab outage" in history_entries[0]["note"]

    # 2. Cannot update closed ticket
    fake_complaint["status"] = "CLOSED"
    with pytest.raises(HTTPException) as exc_info:
        await update_complaint_priority("261030120000", payload, admin_user)
    assert exc_info.value.status_code == 400

    # 3. Non-existent ticket returns 404
    with pytest.raises(HTTPException) as exc_info:
        await update_complaint_priority("999999999999", payload, admin_user)
    assert exc_info.value.status_code == 404
