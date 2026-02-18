from twilio.rest import Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def send_sms(
    to_number: str,
    from_number: str,
    body: str,
    account_sid: str,
    auth_token: str,
) -> Optional[str]:
    """Send an SMS via Twilio. Returns the message SID on success."""
    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            to=to_number,
            from_=from_number,
            body=body,
        )
        logger.info(f"SMS sent: {message.sid}")
        return message.sid
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return None


def format_slot_message(
    restaurant_name: str,
    date_time: str,
    party_size: int,
    slot_id: int,
) -> str:
    """Format a notification message for a found slot."""
    # Parse the dateTime string
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(date_time)
        formatted_date = dt.strftime("%A, %B %d")
        formatted_time = dt.strftime("%I:%M %p")
    except Exception:
        formatted_date = date_time
        formatted_time = ""

    msg = (
        f"TableSnipe found a reservation!\n\n"
        f"Restaurant: {restaurant_name}\n"
        f"Date: {formatted_date}\n"
        f"Time: {formatted_time}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES {slot_id} to book, or NO {slot_id} to skip."
    )
    return msg
