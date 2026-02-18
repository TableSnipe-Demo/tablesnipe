from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Monitor schemas ---

class MonitorCreate(BaseModel):
    restaurant_id: str
    restaurant_name: str
    restaurant_image_url: Optional[str] = None
    day_of_week: int  # 0=Monday, 6=Sunday
    time_start: str  # "18:00"
    time_end: str  # "21:00"
    party_size: int = 2
    weeks_ahead: int = 4


class MonitorUpdate(BaseModel):
    day_of_week: Optional[int] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    party_size: Optional[int] = None
    weeks_ahead: Optional[int] = None
    active: Optional[bool] = None


class MonitorResponse(BaseModel):
    id: int
    restaurant_id: str
    restaurant_name: str
    restaurant_image_url: Optional[str] = None
    day_of_week: int
    time_start: str
    time_end: str
    party_size: int
    weeks_ahead: int
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- FoundSlot schemas ---

class FoundSlotResponse(BaseModel):
    id: int
    monitor_id: int
    date: str
    time: str
    party_size: int
    booking_url: Optional[str] = None
    status: str
    notified_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Settings schemas ---

class SettingsUpdate(BaseModel):
    user_phone: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    poll_interval_minutes: Optional[int] = None


class SettingsResponse(BaseModel):
    user_phone: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token_set: bool = False
    twilio_phone_number: Optional[str] = None
    poll_interval_minutes: int = 15

    model_config = {"from_attributes": True}


# --- Restaurant search ---

class RestaurantSearchResult(BaseModel):
    id: str
    name: str
    address: str
    city: str
    cuisine: str
    price_range: Optional[str] = None
    rating: Optional[float] = None
    image_url: Optional[str] = None
    profile_url: Optional[str] = None


class AvailabilitySlot(BaseModel):
    time: str
    booking_token: Optional[str] = None
    booking_url: Optional[str] = None


# --- Poll status ---

class PollStatusResponse(BaseModel):
    last_poll: Optional[datetime] = None
    next_poll: Optional[datetime] = None
    is_running: bool = False
    monitors_checked: int = 0
    slots_found: int = 0
