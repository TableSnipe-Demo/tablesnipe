from pydantic import BaseModel
from typing import Optional


class MonitorCreate(BaseModel):
    restaurant_name: str
    restaurant_id: str
    party_size: int = 2
    days_of_week: list[int] = []  # 0=Mon, 1=Tue, ..., 6=Sun
    time_start: str = "18:00"
    time_end: str = "21:00"
    weeks_ahead: int = 4
    enabled: bool = True


class MonitorUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    restaurant_id: Optional[str] = None
    party_size: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    weeks_ahead: Optional[int] = None
    enabled: Optional[bool] = None


class MonitorResponse(BaseModel):
    id: int
    restaurant_name: str
    restaurant_id: str
    party_size: int
    days_of_week: list[int]
    time_start: str
    time_end: str
    weeks_ahead: int
    enabled: bool
    created_at: str
    updated_at: str


class NotificationResponse(BaseModel):
    id: int
    monitor_id: int
    restaurant_name: str
    slot_datetime: str
    party_size: int
    slot_hash: Optional[str]
    slot_token: Optional[str]
    status: str
    sms_sid: Optional[str]
    created_at: str


class SettingsUpdate(BaseModel):
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    user_phone_number: Optional[str] = None
    opentable_auth_token: Optional[str] = None


class SettingsResponse(BaseModel):
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    user_phone_number: str = ""
    opentable_auth_token: str = ""


class LoginRequest(BaseModel):
    secret: str


class AvailabilitySlot(BaseModel):
    datetime: str
    available: bool
    token: Optional[str] = None
    slot_hash: Optional[str] = None
    dining_areas: list[dict] = []
    type: str = "Standard"
