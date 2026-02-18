import logging
import os

from twilio.rest import Client

logger = logging.getLogger(__name__)


def get_twilio_client(account_sid: str, auth_token: str) -> Client | None:
    """Create a Twilio client with the given credentials."""
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
) -> str | None:
    """Send an SMS message. Returns message SID or None on failure."""
    try:
        message = client.messages.create(
            to=to_number,
            from_=from_number,
            body=body,
        )
        logger.info(f"Sent SMS {message.sid}: {body[:50]}...")
        return message.sid
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return None


def format_availability_message(
    restaurant_name: str,
    slot_datetime: str,
    party_size: int,
    notification_id: int,
) -> str:
    """Format an SMS notification about an available slot."""
    return (
        f"TableSnipe: {restaurant_name} has an opening!\n"
        f"Date/Time: {slot_datetime}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES {notification_id} to book, or NO {notification_id} to skip."
    )
