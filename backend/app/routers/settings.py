from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppSettings
from app.schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create_settings(db: Session) -> AppSettings:
    settings = db.query(AppSettings).first()
    if not settings:
        settings = AppSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    return SettingsResponse(
        user_phone=settings.user_phone,
        twilio_account_sid=settings.twilio_account_sid,
        twilio_auth_token_set=bool(settings.twilio_auth_token),
        twilio_phone_number=settings.twilio_phone_number,
        poll_interval_minutes=settings.poll_interval_minutes or 15,
    )


@router.put("/", response_model=SettingsResponse)
def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)

    return SettingsResponse(
        user_phone=settings.user_phone,
        twilio_account_sid=settings.twilio_account_sid,
        twilio_auth_token_set=bool(settings.twilio_auth_token),
        twilio_phone_number=settings.twilio_phone_number,
        poll_interval_minutes=settings.poll_interval_minutes or 15,
    )
