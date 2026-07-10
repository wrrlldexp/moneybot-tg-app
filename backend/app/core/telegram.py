"""Telegram WebApp initData HMAC-SHA256 validation."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote

from pydantic import BaseModel

INIT_DATA_MAX_AGE_SEC = 300


class TelegramUser(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None
    is_premium: bool | None = None
    photo_url: str | None = None


def validate_init_data(init_data: str, bot_token: str) -> TelegramUser:
    """Validate Telegram WebApp initData and return parsed user."""
    parsed = parse_qs(init_data, keep_blank_values=True)

    received_hash = parsed.get("hash", [None])[0]
    if not received_hash:
        raise ValueError("Missing hash in initData")

    auth_date_str = parsed.get("auth_date", [None])[0]
    if not auth_date_str:
        raise ValueError("Missing auth_date in initData")

    if time.time() - int(auth_date_str) > INIT_DATA_MAX_AGE_SEC:
        raise ValueError("initData expired")

    items = []
    for key, values in parsed.items():
        if key == "hash":
            continue
        items.append(f"{key}={values[0]}")
    data_check_string = "\n".join(sorted(items))

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("Invalid initData signature")

    user_json = parsed.get("user", [None])[0]
    if not user_json:
        raise ValueError("Missing user in initData")

    return TelegramUser(**json.loads(unquote(user_json)))
