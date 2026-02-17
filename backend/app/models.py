import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    twilio_account_sid: Mapped[str] = mapped_column(String, default="")
    twilio_auth_token: Mapped[str] = mapped_column(String, default="")
    twilio_phone_number: Mapped[str] = mapped_column(String, default="")
    user_phone_number: Mapped[str] = mapped_column(String, default="")
    opentable_auth_token: Mapped[str] = mapped_column(String, default="")
    polling_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    polling_interval_minutes: Mapped[int] = mapped_column(Integer, default=15)


class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_id: Mapped[str] = mapped_column(String, nullable=False)
    restaurant_name: Mapped[str] = mapped_column(String, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, default=2)
    target_day_of_week: Mapped[str] = mapped_column(String, nullable=False)
    target_time: Mapped[str] = mapped_column(String, nullable=False)
    weeks_ahead: Mapped[int] = mapped_column(Integer, default=4)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="monitor", cascade="all, delete-orphan"
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    monitor_id: Mapped[int] = mapped_column(Integer, ForeignKey("monitors.id"), nullable=False)
    slot_datetime: Mapped[str] = mapped_column(String, nullable=False)
    slot_hash: Mapped[str] = mapped_column(String, nullable=False)
    slot_token: Mapped[str] = mapped_column(String, default="")
    dining_area_id: Mapped[str] = mapped_column(String, default="1")
    table_attribute: Mapped[str] = mapped_column(String, default="default")
    status: Mapped[str] = mapped_column(String, default="pending")
    twilio_message_sid: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    responded_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    monitor: Mapped["Monitor"] = relationship(back_populates="notifications")


class AvailabilityLog(Base):
    __tablename__ = "availability_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    monitor_id: Mapped[int] = mapped_column(Integer, ForeignKey("monitors.id"), nullable=False)
    checked_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    date_checked: Mapped[str] = mapped_column(String, nullable=False)
    slots_found: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
