"""Redis pub/sub listener — forwards alerts from trading bots to Telegram."""

from __future__ import annotations

import json
import logging

import redis.asyncio as aioredis
from aiogram import Bot

from bot.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

ALERTS_CHANNEL = "alerts"


async def start_notification_listener(bot: Bot) -> None:
    r = aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(ALERTS_CHANNEL)

    log.info("Notification listener started")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                alert = json.loads(message["data"])
                if alert.get("send_telegram"):
                    await _dispatch(bot, alert)
            except Exception:
                log.exception("Error processing alert")
    finally:
        await pubsub.unsubscribe(ALERTS_CHANNEL)
        await r.aclose()


async def _dispatch(bot: Bot, alert: dict) -> None:
    level = alert.get("level", "info").upper()
    msg = alert.get("message", "")
    text = f"[{level}] {msg}"

    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, text)
        except Exception:
            log.warning("Failed to notify %s", admin_id)
