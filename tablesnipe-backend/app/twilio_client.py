import logging
from twilio.rest import Client
from typing import Optional

logger = logging.getLogger(__name__)


def get_twilio_client(account_sid: str, auth_token: str) -> Optional[Client]:
    """Create a Twilio client with the given credentials."""
    if not account_sid or not auth_token:
        logger.warning("Twilio credentials not configured")
        return None
    try:
        return Client(account_sid, auth_token)
    except Exception as e:
        logger.error(f"Failed to create Twilio client: {e}")
        return None


def send_sms(
    client: Client,
    from_number: str,
    to_number: str,
    body: str,
) -> Optional[str]:
    """
    Send an SMS message via Twilio.

    Returns the message SID if successful, None otherwise.
    """
    try:
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )
        logger.info(f"SMS sent: {message.sid}")
        return message.sid
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return None


def format_availability_message(
    restaurant_name: str,
    slot_datetime: str,
    party_size: int,
    notification_id: int,
    booking_url: str = "",
) -> str:
    """Format an SMS message for an available reservation slot."""
    # Parse the datetime for human-readable format
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(slot_datetime)
        date_str = dt.strftime("%A, %B %d")
        time_str = dt.strftime("%-I:%M %p")
    except (ValueError, TypeError):
        date_str = slot_datetime
        time_str = ""

    msg = (
        f"TableSnipe found a table!\n\n"
        f"Restaurant: {restaurant_name}\n"
        f"Date: {date_str}\n"
        f"Time: {time_str}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES {notification_id} to book, or NO {notification_id} to skip."
    )

    if booking_url:
        msg += f"\n\nDirect link: {booking_url}"

    return msg
