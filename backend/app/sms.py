import logging
from twilio.rest import Client
from app.database import get_db

logger = logging.getLogger(__name__)


def get_twilio_settings() -> dict:
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM settings").fetchall()
        return {row["key"]: row["value"] for row in rows}


def get_twilio_client():
    settings = get_twilio_settings()
    sid = settings.get("twilio_account_sid", "")
    token = settings.get("twilio_auth_token", "")
    if not sid or not token:
        return None, settings
    return Client(sid, token), settings


def send_sms(to_number: str, message: str) -> bool:
    client, settings = get_twilio_client()
    if not client:
        logger.warning("Twilio not configured, skipping SMS")
        return False

    from_number = settings.get("twilio_phone_number", "")
    if not from_number:
        logger.warning("Twilio phone number not configured")
        return False

    try:
        client.messages.create(
            body=message,
            from_=from_number,
            to=to_number,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return False


def send_availability_notification(
    booking_id: int,
    restaurant_name: str,
    date: str,
    time: str,
    party_size: int,
) -> bool:
    settings = get_twilio_settings()
    user_phone = settings.get("user_phone_number", "")
    if not user_phone:
        logger.warning("User phone number not configured")
        return False

    message = (
        f"🍽️ TableSnipe Alert!\n"
        f"Table for {party_size} at {restaurant_name}\n"
        f"📅 {date} at {time}\n\n"
        f"Reply YES {booking_id} to book\n"
        f"Reply NO {booking_id} to skip"
    )
    return send_sms(user_phone, message)
