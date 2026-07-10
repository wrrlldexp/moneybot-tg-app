"""Bot commands — /status, /pnl, callbacks.

Queries the TG backend which proxies to trading servers.
"""

from __future__ import annotations

import httpx
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.config import get_settings

router = Router()
settings = get_settings()


async def _backend_get(path: str) -> dict | None:
    """Internal call to our TG backend (no auth — internal network)."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(f"{settings.BACKEND_URL}{path}")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    # TODO: need to know which server — for now show general health
    data = await _backend_get("/health")
    if data is None:
        await message.answer("Backend unavailable")
        return
    await message.answer(f"Service: {data.get('service', '?')}\nStatus: {data.get('status', '?')}")


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "<b>Commands:</b>\n"
        "/start — open Mini App\n"
        "/status — check backend status\n"
        "/help — this message"
    )


@router.callback_query(lambda c: c.data == "cmd_status")
async def cb_status(callback: CallbackQuery) -> None:
    data = await _backend_get("/health")
    text = f"Status: {data.get('status', '?')}" if data else "Backend unavailable"
    await callback.message.answer(text)  # type: ignore[union-attr]
    await callback.answer()
