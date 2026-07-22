"""JWT tokens."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()

_ISSUER = "moneybot-tg"
_AUDIENCE = "moneybot-tg"


class TokenPayload(BaseModel):
    sub: str
    typ: str
    jti: str | None = None
    exp: int
    iss: str | None = None
    aud: str | None = None


def create_access_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "typ": "access",
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TTL_MINUTES),
        "iat": now,
        "jti": str(uuid.uuid4()),
        "iss": _ISSUER,
        "aud": _AUDIENCE,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "typ": "refresh",
        "exp": now + timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
        "iat": now,
        "jti": str(uuid.uuid4()),
        "iss": _ISSUER,
        "aud": _AUDIENCE,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=_ISSUER,
            audience=_AUDIENCE,
        )
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    return TokenPayload.model_validate(payload)
