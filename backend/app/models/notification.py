"""Per-user notification preferences."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    notify_trades: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_errors: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_grid_status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_daily_summary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="notification_settings")


from app.models.user import User  # noqa: E402
