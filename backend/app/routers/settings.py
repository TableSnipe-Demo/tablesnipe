from fastapi import APIRouter
from app.database import get_db
from app.models import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings():
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM settings").fetchall()
    settings_dict = {row["key"]: row["value"] for row in rows}
    return SettingsResponse(
        twilio_account_sid=settings_dict.get("twilio_account_sid", ""),
        twilio_auth_token=settings_dict.get("twilio_auth_token", ""),
        twilio_phone_number=settings_dict.get("twilio_phone_number", ""),
        user_phone_number=settings_dict.get("user_phone_number", ""),
        opentable_api_key=settings_dict.get("opentable_api_key", ""),
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(settings: SettingsUpdate):
    with get_db() as db:
        for key, value in settings.model_dump(exclude_none=True).items():
            db.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
                (key, value, value),
            )
        rows = db.execute("SELECT key, value FROM settings").fetchall()
    settings_dict = {row["key"]: row["value"] for row in rows}
    return SettingsResponse(
        twilio_account_sid=settings_dict.get("twilio_account_sid", ""),
        twilio_auth_token=settings_dict.get("twilio_auth_token", ""),
        twilio_phone_number=settings_dict.get("twilio_phone_number", ""),
        user_phone_number=settings_dict.get("user_phone_number", ""),
        opentable_api_key=settings_dict.get("opentable_api_key", ""),
    )
