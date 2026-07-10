"""Telegram auth — login via initData."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import create_access_token, create_refresh_token
from app.core.telegram import validate_init_data
from app.db import get_db
from app.models.user import User
from app.models.notification import NotificationSettings

router = APIRouter()


class TelegramLoginRequest(BaseModel):
    init_data: str


class UserInfo(BaseModel):
    id: int
    telegram_id: int
    telegram_username: str | None
    first_name: str
    last_name: str | None
    is_admin: bool


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserInfo


@router.post("/login", response_model=LoginResponse)
async def telegram_login(
    payload: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    settings = get_settings()
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Bot not configured")

    try:
        tg_user = validate_init_data(payload.init_data, settings.TELEGRAM_BOT_TOKEN)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    # Find or create user
    result = await db.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            telegram_id=tg_user.id,
            telegram_username=tg_user.username,
            first_name=tg_user.first_name,
            last_name=tg_user.last_name,
        )
        db.add(user)
        await db.flush()
        # Create default notification settings
        db.add(NotificationSettings(user_id=user.id))
    else:
        user.telegram_username = tg_user.username
        user.first_name = tg_user.first_name
        user.last_name = tg_user.last_name
        user.last_login_at = datetime.now(UTC)

    return LoginResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserInfo(
            id=user.id,
            telegram_id=user.telegram_id,
            telegram_username=user.telegram_username,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin,
        ),
    )
