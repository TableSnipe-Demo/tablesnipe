from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.database import Base


class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_name = Column(String, nullable=False)
    restaurant_id = Column(String, nullable=False)
    party_size = Column(Integer, nullable=False, default=2)
    target_time = Column(String, nullable=False)  # e.g. "19:00"
    days_of_week = Column(JSON, nullable=False)  # e.g. [5, 6] for Fri/Sat
    weeks_ahead = Column(Integer, nullable=False, default=4)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    monitor_id = Column(Integer, nullable=False)
    restaurant_name = Column(String, nullable=False)
    restaurant_id = Column(String, nullable=False)
    slot_datetime = Column(String, nullable=False)
    slot_hash = Column(String, nullable=False)
    slot_token = Column(String, nullable=True)
    party_size = Column(Integer, nullable=False)
    status = Column(String, default="pending")  # pending, confirmed, declined, booked, expired, failed
    sms_sid = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)
