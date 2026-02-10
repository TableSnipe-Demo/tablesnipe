from pydantic import BaseModel
from typing import Optional


class MonitorCreate(BaseModel):
    restaurant_name: str
    restaurant_id: str
    day_of_week: str
    time_of_day: str
    party_size: int = 2
    weeks_ahead: int = 4


class MonitorUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    restaurant_id: Optional[str] = None
    day_of_week: Optional[str] = None
    time_of_day: Optional[str] = None
    party_size: Optional[int] = None
    weeks_ahead: Optional[int] = None
    active: Optional[bool] = None


class MonitorResponse(BaseModel):
    id: int
    restaurant_name: str
    restaurant_id: str
    day_of_week: str
    time_of_day: str
    party_size: int
    weeks_ahead: int
    active: bool
    created_at: str
    updated_at: str


class BookingResponse(BaseModel):
    id: int
    monitor_id: int
    restaurant_name: str
    restaurant_id: str
    date: str
    time: str
    party_size: int
    status: str
    created_at: str
    updated_at: str


class SettingsUpdate(BaseModel):
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    user_phone_number: Optional[str] = None


class SettingsResponse(BaseModel):
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    user_phone_number: str = ""


class RestaurantSearchResult(BaseModel):
    id: str
    name: str
    address: str
    locality: str
    region: str
    price_range: str
    cuisine: str
    image_url: str = ""
