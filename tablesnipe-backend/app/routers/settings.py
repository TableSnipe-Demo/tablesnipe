from fastapi import APIRouter, Depends
from app.auth import require_auth
from app.database import get_all_settings, set_setting
from app.models import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTING_KEYS = [
    "twilio_account_sid",
    "twilio_auth_token",
    "twilio_phone_number",
    "user_phone_number",
    "opentable_auth_token",
]


@router.get("", response_model=SettingsResponse)
async def get_settings(_: str = Depends(require_auth)):
    all_settings = await get_all_settings()
    return SettingsResponse(
        twilio_account_sid=all_settings.get("twilio_account_sid", ""),
        twilio_auth_token=_mask_setting(all_settings.get("twilio_auth_token", "")),
        twilio_phone_number=all_settings.get("twilio_phone_number", ""),
        user_phone_number=all_settings.get("user_phone_number", ""),
        opentable_auth_token=_mask_setting(all_settings.get("opentable_auth_token", "")),
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(update: SettingsUpdate, _: str = Depends(require_auth)):
    if update.twilio_account_sid is not None:
        await set_setting("twilio_account_sid", update.twilio_account_sid)
    if update.twilio_auth_token is not None:
        await set_setting("twilio_auth_token", update.twilio_auth_token)
    if update.twilio_phone_number is not None:
        await set_setting("twilio_phone_number", update.twilio_phone_number)
    if update.user_phone_number is not None:
        await set_setting("user_phone_number", update.user_phone_number)
    if update.opentable_auth_token is not None:
        await set_setting("opentable_auth_token", update.opentable_auth_token)

    # Return the updated settings
    all_settings = await get_all_settings()
    return SettingsResponse(
        twilio_account_sid=all_settings.get("twilio_account_sid", ""),
        twilio_auth_token=_mask_setting(all_settings.get("twilio_auth_token", "")),
        twilio_phone_number=all_settings.get("twilio_phone_number", ""),
        user_phone_number=all_settings.get("user_phone_number", ""),
        opentable_auth_token=_mask_setting(all_settings.get("opentable_auth_token", "")),
    )


def _mask_setting(value: str) -> str:
    """Mask a sensitive setting value, showing only the last 4 characters."""
    if not value or len(value) <= 4:
        return value
    return "****" + value[-4:]
