import pytest
from backend.app.services.system_settings_service import (
    mask_secret,
    get_all_settings,
    save_settings,
    FIELD_SPEC,
)
from backend.app.config import settings


def test_mask_secret():
    assert mask_secret("") == ""
    assert mask_secret(None) == ""
    assert mask_secret("1234567890") == "1234...7890"
    assert mask_secret("abc") == "***"


def test_get_all_settings():
    admin_user = {"_id": "test_admin", "notify_on_new_complaint": True}
    res = get_all_settings(admin_user)
    assert "personal" in res
    assert res["personal"]["notify_on_new_complaint"] is True
    assert "agent" in res
    assert "AGENT_ENABLED" in res["agent"]
    assert "AGENT_ASSIGNMENT_MODE" in res["agent"]
    assert "llm" in res
    assert "email" in res
    assert "security" in res
    assert "lifecycle" in res
    assert "general" in res


@pytest.mark.asyncio
async def test_save_settings_validation(monkeypatch):
    class FakeDB:
        class StaffUsers:
            async def update_one(self, *args, **kwargs):
                return None
        class SystemSettings:
            async def update_one(self, *args, **kwargs):
                return None
        staff_users = StaffUsers()
        system_settings = SystemSettings()

    import backend.app.services.system_settings_service as sss
    monkeypatch.setattr(sss, "get_database", lambda: FakeDB())
    monkeypatch.setattr(sss, "update_env_file", lambda updates: None)

    admin_user = {"_id": "admin_123", "notify_on_new_complaint": False}
    payload = {
        "notify_on_new_complaint": True,
        "AGENT_ENABLED": False,
        "AGENT_ASSIGNMENT_MODE": "suggest",
        "AGENT_CATEGORY_MIN_CONFIDENCE": 0.85,
        "AUTO_CLOSE_DAYS": 5,
    }

    result = await save_settings(payload, admin_user)
    assert result["personal"]["notify_on_new_complaint"] is True
    assert result["agent"]["AGENT_ENABLED"] is False
    assert result["agent"]["AGENT_ASSIGNMENT_MODE"] == "suggest"
    assert result["agent"]["AGENT_CATEGORY_MIN_CONFIDENCE"] == 0.85
    assert result["lifecycle"]["AUTO_CLOSE_DAYS"] == 5

    # Reset AGENT_ENABLED back to True for other tests
    setattr(settings, "AGENT_ENABLED", True)
    setattr(settings, "AGENT_ASSIGNMENT_MODE", "auto")
