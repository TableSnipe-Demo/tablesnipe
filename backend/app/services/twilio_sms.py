import logging
from twilio.rest import Client
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def get_twilio_client(
    account_sid: Optional[str] = None,
    auth_token: Optional[str] = None,
) -> Optional[Client]:
    """Get a Twilio client using provided or default credentials."""
    sid = account_sid or settings.TWILIO_ACCOUNT_SID
    token = auth_token or settings.TWILIO_AUTH_TOKEN
    if not sid or not token:
        logger.warning("Twilio credentials not configured")
        return None
    return Client(sid, token)


def send_sms(
    to_phone: str,
    message: str,
    from_phone: Optional[str] = None,
    account_sid: Optional[str] = None,
    auth_token: Optional[str] = None,
) -> Optional[str]:
    """Send an SMS via Twilio. Returns the message SID or None on failure."""
    client = get_twilio_client(account_sid, auth_token)
    if not client:
        logger.error("Cannot send SMS: Twilio client not available")
        return None

    from_number = from_phone or settings.TWILIO_PHONE_NUMBER
    if not from_number:
        logger.error("Cannot send SMS: No Twilio phone number configured")
        return None

    try:
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to_phone,
        )
        logger.info(f"SMS sent to {to_phone}, SID: {msg.sid}")
        return msg.sid
    except Exception as e:
        logger.error(f"Failed to send SMS to {to_phone}: {e}")
        return None


def send_slot_notification(
    to_phone: str,
    restaurant_name: str,
    slot_date: str,
    slot_time: str,
    party_size: int,
    booking_url: Optional[str] = None,
    slot_id: Optional[int] = None,
    from_phone: Optional[str] = None,
    account_sid: Optional[str] = None,
    auth_token: Optional[str] = None,
) -> Optional[str]:
    """Send a reservation availability notification via SMS."""
    message = (
        f"TableSnipe found an opening!\n\n"
        f"Restaurant: {restaurant_name}\n"
        f"Date: {slot_date}\n"
        f"Time: {slot_time}\n"
        f"Party size: {party_size}\n\n"
    )

    if booking_url:
        message += f"Book here: {booking_url}\n\n"

    if slot_id is not None:
        message += f"Reply YES {slot_id} to confirm or NO {slot_id} to skip."
    else:
        message += "Reply YES to confirm or NO to skip."

    return send_sms(
        to_phone=to_phone,
        message=message,
        from_phone=from_phone,
        account_sid=account_sid,
        auth_token=auth_token,
    )
