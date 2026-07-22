"""Bot commands — /status, /help, callbacks."""

from __future__ import annotations

import logging

import httpx
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.config import get_settings

router = Router()
settings = get_settings()
log = logging.getLogger(__name__)


async def _backend_get(path: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(f"{settings.BACKEND_URL}{path}")
            if resp.status_code == 200:
                return resp.json()
            log.warning("Backend returned status %d for %s", resp.status_code, path)
    except httpx.TimeoutException:
        log.error("Backend request timed out: %s", path)
    except httpx.HTTPError as exc:
        log.error("Backend HTTP error for %s: %s", path, exc)
    return None


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    log.info("Command /status from user %s", message.from_user.id if message.from_user else "unknown")
    data = await _backend_get("/health")
    if data is None:
        await message.answer("Бэкенд недоступен. Попробуйте позже.")
        return
    await message.answer(f"Сервис: {data.get('service', '?')}\nСтатус: {data.get('status', '?')}")


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    log.info("Command /help from user %s", message.from_user.id if message.from_user else "unknown")
    await message.answer(
        "<b>Команды:</b>\n"
        "/start — открыть панель управления\n"
        "/status — проверить статус\n"
        "/help — справка"
    )


@router.callback_query(lambda c: c.data == "cmd_status")
async def cb_status(callback: CallbackQuery) -> None:
    log.info("Callback cmd_status from user %s", callback.from_user.id)
    data = await _backend_get("/health")
    text = f"Статус: {data.get('status', '?')}" if data else "Бэкенд недоступен. Попробуйте позже."
    await callback.message.answer(text)  # type: ignore[union-attr]
    await callback.answer()
