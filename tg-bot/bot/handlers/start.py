"""Start command — opens Mini App."""

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.config import get_settings
from bot.keyboards import webapp_keyboard

router = Router()
settings = get_settings()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "<b>MoneyBot</b>\n\nManage your trading bots from Telegram.",
        reply_markup=webapp_keyboard(settings.TELEGRAM_WEBAPP_URL),
    )
