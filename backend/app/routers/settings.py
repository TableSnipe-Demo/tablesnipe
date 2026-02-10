from fastapi import APIRouter, HTTPException, Cookie, Header
from pydantic import BaseModel
from typing import Optional
from app.database import get_all_settings, set_setting
from app.routers.auth import verify_token

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    twilio_sid: Optional[str] = None
    twilio_token: Optional[str] = None
    twilio_phone: Optional[str] = None
    user_phone: Optional[str] = None
    openai_key: Optional[str] = None


@router.get("")
async def get_settings(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    settings = get_all_settings()
    safe = {}
    for k, v in settings.items():
        if k == "app_password":
            continue
        if k in ("twilio_token", "openai_key") and v:
            safe[k] = v[:4] + "****" + v[-4:] if len(v) > 8 else "****"
        else:
            safe[k] = v
    return safe


@router.put("")
async def update_settings(req: SettingsUpdate, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    if req.twilio_sid is not None:
        set_setting("twilio_sid", req.twilio_sid)
    if req.twilio_token is not None:
        set_setting("twilio_token", req.twilio_token)
    if req.twilio_phone is not None:
        set_setting("twilio_phone", req.twilio_phone)
    if req.user_phone is not None:
        set_setting("user_phone", req.user_phone)
    if req.openai_key is not None:
        set_setting("openai_key", req.openai_key)
    return {"status": "ok"}
