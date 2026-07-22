"""Publish user-scoped alerts to Redis for the Telegram bot."""

import json
import logging

import redis.asyncio as aioredis

from app.config import get_settings

log = logging.getLogger(__name__)

ALERTS_CHANNEL = "alerts"


async def publish_alert(
    telegram_id: int,
    message: str,
    level: str = "info",
) -> None:
    """Publish an alert targeted at a specific user."""
    settings = get_settings()
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        payload = json.dumps({
            "send_telegram": True,
            "telegram_id": telegram_id,
            "message": message,
            "level": level,
        })
        await r.publish(ALERTS_CHANNEL, payload)
        await r.aclose()
    except Exception:
        log.warning("Failed to publish alert for user %s", telegram_id)
