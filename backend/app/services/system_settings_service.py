"""System Settings Service.

Provides centralized management for all configurable application and agent settings.
Handles runtime settings synchronization, persistent MongoDB storage, and .env file updates.
"""

import os
import re
import logging
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.db import get_database

logger = logging.getLogger("system_settings_service")

# All recognized configurable fields and their target types
FIELD_SPEC = {
    # Agentic AI
    "AGENT_ENABLED": bool,
    "AGENT_ASSIGNMENT_MODE": str,
    "AGENT_USE_LLM": bool,
    "AGENT_LLM_REASON": bool,
    "AGENT_CATEGORY_MIN_CONFIDENCE": float,
    "AGENT_SIMILAR_WINDOW_HOURS": int,
    "AGENT_PREVIOUS_FAULT_DAYS": int,
    "AGENT_HIGH_IMPACT_USERS": int,
    "AGENT_CRITICAL_IMPACT_USERS": int,
    "AGENT_PRIORITY_LOCATIONS": str,
    "AGENT_STUCK_MINUTES": int,
    "AGENT_SWEEP_MINUTES": int,
    "AGENT_MAX_ATTEMPTS": int,
    "AGENT_ASSIGNMENT_WEIGHTS": str,
    "RAG_AUTO_INDEX_CLOSED": bool,
    "RAG_INCLUDE_AUTO_CLOSED": bool,
    "AGENT_USE_RAG_SIMILARITY": bool,
    "FLOW_TRACE": bool,
    "FLOW_TRACE_SLOW_MS": int,

    # LLM Orchestration
    "LLM_PROVIDER_ORDER": str,
    "GEMINI_MODEL": str,
    "GEMINI_TIMEOUT": float,
    "OPENAI_MODEL": str,
    "GROK_MODEL": str,
    "LLM_MODEL_CHAT": str,
    "LLM_MODEL_GUARD": str,
    "GEMINI_API_KEY": str,
    "OPENAI_API_KEY": str,
    "GROK_API_KEY": str,
    "LLM_API_KEY": str,

    # Email & Outbox
    "EMAIL_BACKEND": str,
    "SMTP_HOST": str,
    "SMTP_PORT": int,
    "SMTP_USER": str,
    "SMTP_PASSWORD": str,
    "SMTP_USE_TLS": bool,
    "EMAIL_FROM": str,
    "INCHARGE_CC_EMAILS": str,

    # Security & OTP
    "ALLOWED_EMAIL_DOMAIN": str,
    "OTP_EXPIRE_MINUTES": int,
    "OTP_MAX_ATTEMPTS": int,
    "OTP_RESEND_SECONDS": int,
    "OTP_MAX_RESENDS": int,
    "OTP_MAX_REQUESTS_PER_EMAIL_PER_HOUR": int,
    "LOGIN_MAX_FAILURES": int,
    "LOGIN_LOCK_MINUTES": int,

    # Lifecycle & Limits
    "AUTO_CLOSE_DAYS": int,
    "AUTO_CLOSE_CHECK_MINUTES": int,
    "ACTION_TOKEN_EXPIRY_DAYS": int,
    "MAX_CHAT_MESSAGES": int,
    "MAX_UPLOAD_MB": int,
    "SCORE_FORMULA": str,
    "SCORE_PRIOR_MEAN": float,
    "SCORE_PRIOR_COUNT": float,

    # General
    "COLLEGE_NAME": str,
    "APP_TIMEZONE": str,
}

SENSITIVE_FIELDS = {
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "GROK_API_KEY",
    "LLM_API_KEY",
    "SMTP_PASSWORD",
}


def get_env_file_path() -> str:
    """Resolves the absolute path to the project root .env file."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidate = os.path.join(base_dir, ".env")
    if os.path.exists(candidate):
        return candidate
    if os.path.exists(".env"):
        return os.path.abspath(".env")
    return candidate


def mask_secret(val: Optional[str], prefix_len: int = 4, suffix_len: int = 4) -> str:
    """Returns a safely masked preview of a secret string."""
    if not val:
        return ""
    v = str(val).strip()
    if len(v) <= prefix_len + suffix_len:
        return f"...{v[-suffix_len:]}" if len(v) >= suffix_len else "***"
    return f"{v[:prefix_len]}...{v[-suffix_len:]}"


def update_env_file(updates: Dict[str, Any]) -> None:
    """Updates key-value pairs in the .env file while preserving comments and structure."""
    env_path = get_env_file_path()
    if not os.path.exists(env_path):
        logger.warning(f"[SettingsService] .env file not found at {env_path}. Skipping file write.")
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()

        for key, raw_val in updates.items():
            if isinstance(raw_val, bool):
                val_str = "true" if raw_val else "false"
            else:
                val_str = str(raw_val).strip()

            # Pattern to match KEY=... or # KEY=...
            pattern = re.compile(rf"^(?:#\s*)?{re.escape(key)}\s*=.*$", re.MULTILINE)
            new_line = f"{key}={val_str}"

            if pattern.search(content):
                content = pattern.sub(new_line, content)
            else:
                # Append if not found
                if not content.endswith("\n"):
                    content += "\n"
                content += f"{new_line}\n"

        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)

        logger.info(f"[SettingsService] Updated {len(updates)} keys in {env_path}")
    except Exception as e:
        logger.error(f"[SettingsService] Error updating .env file: {e}", exc_info=True)


async def load_db_overrides_into_settings() -> None:
    """Loads stored system settings from MongoDB into the runtime Settings singleton on startup."""
    try:
        db = get_database()
        doc = await db.system_settings.find_one({"_id": "global_config"})
        if not doc:
            return

        applied = 0
        for k, v in doc.items():
            if k == "_id":
                continue
            if k in FIELD_SPEC and hasattr(settings, k):
                target_type = FIELD_SPEC[k]
                try:
                    if target_type == bool:
                        typed_val = bool(v) if not isinstance(v, str) else v.lower() == "true"
                    else:
                        typed_val = target_type(v)
                    setattr(settings, k, typed_val)
                    applied += 1
                except Exception as ex:
                    logger.warning(f"[SettingsService] Failed to cast override {k}={v}: {ex}")

        logger.info(f"[SettingsService] Applied {applied} settings overrides from MongoDB.")
    except Exception as e:
        logger.warning(f"[SettingsService] Unable to load DB overrides: {e}")


def get_all_settings(admin_user: dict) -> Dict[str, Any]:
    """Retrieves all system configuration settings structured for the Admin Settings UI."""
    gemini_key = getattr(settings, "GEMINI_API_KEY", "")
    openai_key = getattr(settings, "OPENAI_API_KEY", "")
    grok_key = getattr(settings, "GROK_API_KEY", "")
    llm_key = getattr(settings, "LLM_API_KEY", "")
    smtp_pass = getattr(settings, "SMTP_PASSWORD", "")

    return {
        "personal": {
            "notify_on_new_complaint": bool(admin_user.get("notify_on_new_complaint", False)),
        },
        "agent": {
            "AGENT_ENABLED": bool(getattr(settings, "AGENT_ENABLED", True)),
            "AGENT_ASSIGNMENT_MODE": str(getattr(settings, "AGENT_ASSIGNMENT_MODE", "auto")).lower(),
            "AGENT_USE_LLM": bool(getattr(settings, "AGENT_USE_LLM", True)),
            "AGENT_LLM_REASON": bool(getattr(settings, "AGENT_LLM_REASON", True)),
            "AGENT_CATEGORY_MIN_CONFIDENCE": float(getattr(settings, "AGENT_CATEGORY_MIN_CONFIDENCE", 0.75)),
            "AGENT_SIMILAR_WINDOW_HOURS": int(getattr(settings, "AGENT_SIMILAR_WINDOW_HOURS", 6)),
            "AGENT_PREVIOUS_FAULT_DAYS": int(getattr(settings, "AGENT_PREVIOUS_FAULT_DAYS", 90)),
            "AGENT_HIGH_IMPACT_USERS": int(getattr(settings, "AGENT_HIGH_IMPACT_USERS", 5)),
            "AGENT_CRITICAL_IMPACT_USERS": int(getattr(settings, "AGENT_CRITICAL_IMPACT_USERS", 20)),
            "AGENT_PRIORITY_LOCATIONS": str(getattr(settings, "AGENT_PRIORITY_LOCATIONS", "")),
            "AGENT_STUCK_MINUTES": int(getattr(settings, "AGENT_STUCK_MINUTES", 10)),
            "AGENT_SWEEP_MINUTES": int(getattr(settings, "AGENT_SWEEP_MINUTES", 5)),
            "AGENT_MAX_ATTEMPTS": int(getattr(settings, "AGENT_MAX_ATTEMPTS", 3)),
            "AGENT_ASSIGNMENT_WEIGHTS": str(getattr(settings, "AGENT_ASSIGNMENT_WEIGHTS", "")),
            "RAG_AUTO_INDEX_CLOSED": bool(getattr(settings, "RAG_AUTO_INDEX_CLOSED", True)),
            "RAG_INCLUDE_AUTO_CLOSED": bool(getattr(settings, "RAG_INCLUDE_AUTO_CLOSED", False)),
            "AGENT_USE_RAG_SIMILARITY": bool(getattr(settings, "AGENT_USE_RAG_SIMILARITY", False)),
            "FLOW_TRACE": bool(getattr(settings, "FLOW_TRACE", True)),
            "FLOW_TRACE_SLOW_MS": int(getattr(settings, "FLOW_TRACE_SLOW_MS", 3000)),
        },
        "llm": {
            "LLM_PROVIDER_ORDER": str(getattr(settings, "LLM_PROVIDER_ORDER", "gemini,openai,grok,anthropic,mock")),
            "GEMINI_MODEL": str(getattr(settings, "GEMINI_MODEL", "gemini-3.8-flash")),
            "GEMINI_TIMEOUT": float(getattr(settings, "GEMINI_TIMEOUT", 60.0)),
            "OPENAI_MODEL": str(getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")),
            "GROK_MODEL": str(getattr(settings, "GROK_MODEL", "grok-beta")),
            "LLM_MODEL_CHAT": str(getattr(settings, "LLM_MODEL_CHAT", "claude-3-5-sonnet-20241022")),
            "LLM_MODEL_GUARD": str(getattr(settings, "LLM_MODEL_GUARD", "claude-3-5-haiku-20241022")),
            "has_gemini_key": bool(gemini_key),
            "masked_gemini_key": mask_secret(gemini_key),
            "has_openai_key": bool(openai_key),
            "masked_openai_key": mask_secret(openai_key),
            "has_grok_key": bool(grok_key),
            "masked_grok_key": mask_secret(grok_key),
            "has_llm_key": bool(llm_key),
            "masked_llm_key": mask_secret(llm_key),
        },
        "email": {
            "EMAIL_BACKEND": str(getattr(settings, "EMAIL_BACKEND", "console")).lower(),
            "SMTP_HOST": str(getattr(settings, "SMTP_HOST", "localhost")),
            "SMTP_PORT": int(getattr(settings, "SMTP_PORT", 25)),
            "SMTP_USER": str(getattr(settings, "SMTP_USER", "")),
            "has_smtp_password": bool(smtp_pass),
            "masked_smtp_password": mask_secret(smtp_pass, 1, 1),
            "SMTP_USE_TLS": bool(getattr(settings, "SMTP_USE_TLS", False)),
            "EMAIL_FROM": str(getattr(settings, "EMAIL_FROM", "noreply@mnnit.ac.in")),
            "INCHARGE_CC_EMAILS": str(getattr(settings, "INCHARGE_CC_EMAILS", "")),
        },
        "security": {
            "ALLOWED_EMAIL_DOMAIN": str(getattr(settings, "ALLOWED_EMAIL_DOMAIN", "mnnit.ac.in")),
            "OTP_EXPIRE_MINUTES": int(getattr(settings, "OTP_EXPIRE_MINUTES", 10)),
            "OTP_MAX_ATTEMPTS": int(getattr(settings, "OTP_MAX_ATTEMPTS", 5)),
            "OTP_RESEND_SECONDS": int(getattr(settings, "OTP_RESEND_SECONDS", 60)),
            "OTP_MAX_RESENDS": int(getattr(settings, "OTP_MAX_RESENDS", 3)),
            "OTP_MAX_REQUESTS_PER_EMAIL_PER_HOUR": int(getattr(settings, "OTP_MAX_REQUESTS_PER_EMAIL_PER_HOUR", 5)),
            "LOGIN_MAX_FAILURES": int(getattr(settings, "LOGIN_MAX_FAILURES", 5)),
            "LOGIN_LOCK_MINUTES": int(getattr(settings, "LOGIN_LOCK_MINUTES", 15)),
        },
        "lifecycle": {
            "AUTO_CLOSE_DAYS": int(getattr(settings, "AUTO_CLOSE_DAYS", 3)),
            "AUTO_CLOSE_CHECK_MINUTES": int(getattr(settings, "AUTO_CLOSE_CHECK_MINUTES", 30)),
            "ACTION_TOKEN_EXPIRY_DAYS": int(getattr(settings, "ACTION_TOKEN_EXPIRY_DAYS", 14)),
            "MAX_CHAT_MESSAGES": int(getattr(settings, "MAX_CHAT_MESSAGES", 10)),
            "MAX_UPLOAD_MB": int(getattr(settings, "MAX_UPLOAD_MB", 10)),
            "SCORE_FORMULA": str(getattr(settings, "SCORE_FORMULA", "average")).lower(),
            "SCORE_PRIOR_MEAN": float(getattr(settings, "SCORE_PRIOR_MEAN", 3.5)),
            "SCORE_PRIOR_COUNT": float(getattr(settings, "SCORE_PRIOR_COUNT", 5.0)),
        },
        "general": {
            "COLLEGE_NAME": str(getattr(settings, "COLLEGE_NAME", "MNNIT Allahabad")),
            "APP_TIMEZONE": str(getattr(settings, "APP_TIMEZONE", "Asia/Kolkata")),
        }
    }


async def save_settings(payload: Dict[str, Any], admin_user: dict) -> Dict[str, Any]:
    """Validates, persists and applies setting changes to runtime, MongoDB, and .env."""
    db = get_database()

    # Flatten nested payload if passed as sections
    flat_updates: Dict[str, Any] = {}
    for k, v in payload.items():
        if isinstance(v, dict):
            for sub_k, sub_v in v.items():
                flat_updates[sub_k] = sub_v
        else:
            flat_updates[k] = v

    # 1. Handle admin personal notification preference
    if "notify_on_new_complaint" in flat_updates:
        notify_flag = bool(flat_updates["notify_on_new_complaint"])
        await db.staff_users.update_one(
            {"_id": admin_user["_id"]},
            {"$set": {"notify_on_new_complaint": notify_flag}}
        )
        admin_user["notify_on_new_complaint"] = notify_flag

    valid_system_updates: Dict[str, Any] = {}
    llm_needs_reinit = False

    for key, raw_val in flat_updates.items():
        if key not in FIELD_SPEC:
            continue

        # Skip sensitive keys if left empty or containing masked placeholders
        if key in SENSITIVE_FIELDS:
            if not raw_val or not isinstance(raw_val, str):
                continue
            val_clean = raw_val.strip()
            if not val_clean or "..." in val_clean or val_clean == "***" or val_clean == "NOT_SET":
                continue

        target_type = FIELD_SPEC[key]
        try:
            if target_type == bool:
                if isinstance(raw_val, bool):
                    val = raw_val
                elif isinstance(raw_val, str):
                    val = raw_val.strip().lower() in ("true", "1", "yes")
                else:
                    val = bool(raw_val)
            elif target_type == int:
                val = int(raw_val)
            elif target_type == float:
                val = float(raw_val)
            else:
                val = str(raw_val).strip()

            # Specific constraints validation
            if key == "AGENT_ASSIGNMENT_MODE" and val not in ("auto", "suggest", "off"):
                continue
            if key == "EMAIL_BACKEND" and val not in ("console", "smtp"):
                continue
            if key == "SCORE_FORMULA" and val not in ("average", "weighted"):
                continue
            if key == "AGENT_CATEGORY_MIN_CONFIDENCE":
                val = max(0.0, min(1.0, val))

            # Apply runtime
            setattr(settings, key, val)
            valid_system_updates[key] = val

            if key in ("LLM_PROVIDER_ORDER", "GEMINI_MODEL", "GEMINI_TIMEOUT", "OPENAI_MODEL",
                        "GROK_MODEL", "LLM_MODEL_CHAT", "LLM_MODEL_GUARD", "GEMINI_API_KEY",
                        "OPENAI_API_KEY", "GROK_API_KEY", "LLM_API_KEY"):
                llm_needs_reinit = True

        except (ValueError, TypeError) as ex:
            logger.warning(f"[SettingsService] Invalid value for setting {key}={raw_val}: {ex}")

    # 2. Persist to MongoDB
    if valid_system_updates:
        await db.system_settings.update_one(
            {"_id": "global_config"},
            {"$set": valid_system_updates},
            upsert=True
        )

        # 3. Synchronize to .env file
        update_env_file(valid_system_updates)

    # 4. Reinitialize LLM router providers if required
    if llm_needs_reinit:
        try:
            from backend.app.services.llm_router import llm_router
            llm_router._init_providers()
            logger.info("[SettingsService] Successfully reinitialized LLM router providers.")
        except Exception as e:
            logger.warning(f"[SettingsService] Error reinitializing LLM router: {e}")

    return get_all_settings(admin_user)
