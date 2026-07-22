"""Trading server connections — each user can have multiple servers."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Boolean, Text, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.orm.attributes import set_committed_value

from app.db import Base


class TradingServer(Base):
    __tablename__ = "trading_servers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    # Auth credentials for the trading bot
    server_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    server_password: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Tokens obtained from the trading bot (auto-managed)
    api_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_ping_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="servers")

    def __repr__(self) -> str:
        return f"<TradingServer {self.name} ({self.url})>"


# ---------------------------------------------------------------------------
# Transparent encryption for sensitive fields via SQLAlchemy events
# ---------------------------------------------------------------------------
_ENCRYPTED_FIELDS = ("server_password", "api_token", "refresh_token")


def _encrypt_field(value: str | None) -> str | None:
    if value is None:
        return None
    from app.core.encryption import encrypt_value
    # Skip if already encrypted (Fernet tokens start with 'gAAAAA')
    if value.startswith("gAAAAA"):
        return value
    return encrypt_value(value)


def _decrypt_field(value: str | None) -> str | None:
    if value is None:
        return None
    from app.core.encryption import decrypt_value
    try:
        return decrypt_value(value)
    except ValueError:
        # Value might not be encrypted yet (migration period)
        return value


@event.listens_for(TradingServer, "before_insert")
@event.listens_for(TradingServer, "before_update")
def _encrypt_on_persist(mapper, connection, target):
    for field in _ENCRYPTED_FIELDS:
        raw = getattr(target, field)
        if raw is not None:
            setattr(target, field, _encrypt_field(raw))


@event.listens_for(TradingServer, "load")
def _decrypt_on_load(target, context):
    for field in _ENCRYPTED_FIELDS:
        raw = getattr(target, field)
        if raw is not None:
            set_committed_value(target, field, _decrypt_field(raw))


from app.models.user import User  # noqa: E402
