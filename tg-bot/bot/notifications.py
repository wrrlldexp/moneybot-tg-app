"""Redis pub/sub listener — forwards alerts from trading bots to Telegram."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict

import redis.asyncio as aioredis
from redis.exceptions import ConnectionError as RedisConnectionError, RedisError
from aiogram import Bot

from bot.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

ALERTS_CHANNEL = "alerts"

# Required fields for a valid alert message
_REQUIRED_FIELDS = {"send_telegram", "message"}
_OPTIONAL_FIELDS = {"level", "chat_id"}
_ALLOWED_FIELDS = _REQUIRED_FIELDS | _OPTIONAL_FIELDS

# Rate limiting: max messages per user per minute
_RATE_LIMIT = 20
_RATE_WINDOW = 60  # seconds
_user_timestamps: dict[int, list[float]] = defaultdict(list)

# Retry settings
_MAX_RETRY_DELAY = 60
_BASE_RETRY_DELAY = 1


def _validate_alert(data: object) -> dict | None:
    """Validate that the parsed JSON is a dict with required fields."""
    if not isinstance(data, dict):
        log.warning("Alert is not a dict: %s", type(data).__name__)
        return None
    missing = _REQUIRED_FIELDS - data.keys()
    if missing:
        log.warning("Alert missing required fields: %s", missing)
        return None
    return data


def _check_rate_limit(user_id: int) -> bool:
    """Return True if the user is within rate limits."""
    now = time.monotonic()
    timestamps = _user_timestamps[user_id]
    # Remove expired timestamps
    _user_timestamps[user_id] = [t for t in timestamps if now - t < _RATE_WINDOW]
    if len(_user_timestamps[user_id]) >= _RATE_LIMIT:
        return False
    _user_timestamps[user_id].append(now)
    return True


async def start_notification_listener(bot: Bot) -> None:
    retry_delay = _BASE_RETRY_DELAY

    while True:
        try:
            r = aioredis.from_url(settings.REDIS_URL)
            pubsub = r.pubsub()
            await pubsub.subscribe(ALERTS_CHANNEL)
            log.info("Notification listener started (connected to Redis)")
            retry_delay = _BASE_RETRY_DELAY  # reset on success

            try:
                async for message in pubsub.listen():
                    if message["type"] != "message":
                        continue
                    try:
                        raw = message["data"]
                        data = json.loads(raw)
                        alert = _validate_alert(data)
                        if alert is None:
                            continue
                        if alert.get("send_telegram"):
                            await _dispatch(bot, alert)
                    except json.JSONDecodeError:
                        log.warning("Non-JSON message on alerts channel, skipping")
                    except Exception:
                        log.exception("Error processing alert message")
            finally:
                await pubsub.unsubscribe(ALERTS_CHANNEL)
                await r.aclose()

        except asyncio.CancelledError:
            log.info("Notification listener cancelled")
            raise
        except (RedisConnectionError, RedisError, OSError) as exc:
            log.error(
                "Redis connection error: %s. Retrying in %ds...", exc, retry_delay
            )
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, _MAX_RETRY_DELAY)
        except Exception:
            log.exception("Unexpected error in notification listener, retrying in %ds...", retry_delay)
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, _MAX_RETRY_DELAY)


async def _dispatch(bot: Bot, alert: dict) -> None:
    level = alert.get("level", "info").upper()
    msg = alert.get("message", "")
    text = f"🔔 <b>[{level}]</b>\n{msg}"

    # If alert has telegram_id — send only to that user (per-user alert)
    target_id = alert.get("telegram_id")
    if target_id:
        targets = {int(target_id)}
    else:
        # Fallback: send to admins only (system-wide alerts)
        targets = settings.admin_ids

    if not targets:
        log.warning("No targets for alert: %s", msg[:80])
        return

    for user_id in targets:
        if not _check_rate_limit(user_id):
            log.warning("Rate limit reached for user %s, skipping", user_id)
            continue
        try:
            await bot.send_message(user_id, text, parse_mode="HTML")
        except Exception:
            log.warning("Failed to notify %s", user_id)
