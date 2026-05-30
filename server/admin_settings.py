import json
import os
from typing import Any

import db


def _json_default(value: Any) -> str:
    return json.dumps(value or {})


def ensure_admin_settings_table() -> None:
    try:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL DEFAULT '{}'::jsonb,
                updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    except Exception:
        pass


def get_admin_setting(key: str, default: Any = None) -> Any:
    ensure_admin_settings_table()
    try:
        row = db.query_one("SELECT value FROM admin_settings WHERE key = %s", (key,))
    except Exception:
        return default
    if not row:
        return default
    value = row.get('value')
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return default
    return value if value is not None else default


def save_admin_setting(key: str, value: Any, updated_by: str | None = None) -> Any:
    ensure_admin_settings_table()
    payload = _json_default(value)
    try:
        row = db.execute_returning(
            """
            INSERT INTO admin_settings (key, value, updated_by)
            VALUES (%s, %s::jsonb, %s)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
            RETURNING value
            """,
            (key, payload, updated_by),
        )
        saved = row.get('value') if row else value
        if isinstance(saved, str):
            return json.loads(saved)
        return saved
    except Exception:
        return value


def env_value(*names: str) -> str:
    for name in names:
        value = os.getenv(name, '').strip()
        if value:
            return value
    return ''


def normalize_provider_id(value: str | None) -> str:
    provider_id = str(value or '').strip().lower().replace(' ', '_')
    allowed = set('abcdefghijklmnopqrstuvwxyz0123456789_-')
    if not provider_id or any(char not in allowed for char in provider_id):
        return ''
    return provider_id


def saved_ai_runtime_config() -> dict[str, Any]:
    raw = get_admin_setting('ai_runtime_config', {}) or {}
    return raw if isinstance(raw, dict) else {}


def saved_welcome_message_config() -> dict[str, Any]:
    raw = get_admin_setting('welcome_messages', {}) or {}
    return raw if isinstance(raw, dict) else {}

