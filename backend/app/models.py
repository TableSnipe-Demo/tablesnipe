from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(String, nullable=False)
    restaurant_name = Column(String, nullable=False)
    restaurant_image_url = Column(String, nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    time_start = Column(String, nullable=False)  # e.g. "18:00"
    time_end = Column(String, nullable=False)  # e.g. "21:00"
    party_size = Column(Integer, nullable=False, default=2)
    weeks_ahead = Column(Integer, nullable=False, default=4)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    found_slots = relationship("FoundSlot", back_populates="monitor", cascade="all, delete-orphan")


class FoundSlot(Base):
    __tablename__ = "found_slots"

    id = Column(Integer, primary_key=True, index=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), nullable=False)
    date = Column(String, nullable=False)  # e.g. "2024-01-15"
    time = Column(String, nullable=False)  # e.g. "19:00"
    party_size = Column(Integer, nullable=False)
    booking_token = Column(String, nullable=True)  # OpenTable booking token if available
    booking_url = Column(String, nullable=True)  # Direct booking URL
    status = Column(String, default="found")  # found, notified, accepted, declined, booked, expired
    sms_sid = Column(String, nullable=True)  # Twilio message SID for tracking replies
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    monitor = relationship("Monitor", back_populates="found_slots")


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_phone = Column(String, nullable=True)
    twilio_account_sid = Column(String, nullable=True)
    twilio_auth_token = Column(String, nullable=True)
    twilio_phone_number = Column(String, nullable=True)
    poll_interval_minutes = Column(Integer, default=15)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
