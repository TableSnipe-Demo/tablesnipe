from pydantic import BaseModel
from datetime import datetime


class SettingsUpdate(BaseModel):
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None
    user_phone_number: str | None = None
    opentable_auth_token: str | None = None
    polling_enabled: bool | None = None
    polling_interval_minutes: int | None = None


class SettingsResponse(BaseModel):
    id: int
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    user_phone_number: str
    opentable_auth_token: str
    polling_enabled: bool
    polling_interval_minutes: int

    class Config:
        from_attributes = True


class MonitorCreate(BaseModel):
    restaurant_id: str
    restaurant_name: str
    party_size: int = 2
    target_day_of_week: str
    target_time: str
    weeks_ahead: int = 4


class MonitorUpdate(BaseModel):
    party_size: int | None = None
    target_day_of_week: str | None = None
    target_time: str | None = None
    weeks_ahead: int | None = None
    active: bool | None = None


class MonitorResponse(BaseModel):
    id: int
    restaurant_id: str
    restaurant_name: str
    party_size: int
    target_day_of_week: str
    target_time: str
    weeks_ahead: int
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    monitor_id: int
    slot_datetime: str
    slot_hash: str
    status: str
    created_at: datetime
    responded_at: datetime | None

    class Config:
        from_attributes = True


class AvailabilityLogResponse(BaseModel):
    id: int
    monitor_id: int
    checked_at: datetime
    date_checked: str
    slots_found: int
    error: str | None

    class Config:
        from_attributes = True


class RestaurantSearchResult(BaseModel):
    rid: str
    name: str
    locality: str
    region: str
    cuisine: str
    price_range: str
    rating: float | None = None
    reviews_count: int | None = None
