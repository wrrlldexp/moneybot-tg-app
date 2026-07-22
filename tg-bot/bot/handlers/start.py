"""Start command — opens Mini App and registers user for notifications."""

import logging

import redis.asyncio as aioredis
from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.config import get_settings
from bot.keyboards import webapp_keyboard

log = logging.getLogger(__name__)
router = Router()
settings = get_settings()

SUBSCRIBERS_KEY = "notification_subscribers"


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    # Register user for notifications
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.sadd(SUBSCRIBERS_KEY, message.from_user.id)
        await r.aclose()
        log.info("Registered subscriber: %s (%s)", message.from_user.id, message.from_user.username)
    except Exception:
        log.warning("Failed to register subscriber %s in Redis", message.from_user.id)

    await message.answer(
        "<b>MoneyBot</b>\n\nУправляйте торговыми ботами прямо из Telegram.",
        reply_markup=webapp_keyboard(settings.TELEGRAM_WEBAPP_URL),
    )
