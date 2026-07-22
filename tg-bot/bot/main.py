"""Telegram Bot entry point — aiogram 3."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from bot.config import get_settings
from bot.handlers import commands, start
from bot.notifications import start_notification_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

    dp = Dispatcher()
    dp.include_router(start.router)
    dp.include_router(commands.router)

    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def _signal_handler(sig: int) -> None:
        log.info("Received signal %s, shutting down...", signal.Signals(sig).name)
        shutdown_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _signal_handler, sig)

    notification_task = asyncio.create_task(start_notification_listener(bot))

    log.info("Bot starting...")
    try:
        polling_task = asyncio.create_task(
            dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
        )
        await shutdown_event.wait()
        log.info("Shutdown initiated, stopping polling...")
        await dp.stop_polling()
        polling_task.cancel()
    except Exception:
        log.exception("Unexpected error in main loop")
    finally:
        notification_task.cancel()
        try:
            await notification_task
        except asyncio.CancelledError:
            pass
        await bot.session.close()
        log.info("Bot stopped.")


if __name__ == "__main__":
    asyncio.run(main())
