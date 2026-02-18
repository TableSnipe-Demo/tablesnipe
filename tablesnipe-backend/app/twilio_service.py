import os
from twilio.rest import Client
from typing import Optional


def get_twilio_client(account_sid: str, auth_token: str) -> Optional[Client]:
    """Create a Twilio client with the given credentials."""
    if not account_sid or not auth_token:
        return None
    try:
        return Client(account_sid, auth_token)
    except Exception as e:
        print(f"Error creating Twilio client: {e}")
        return None


def send_sms(
    account_sid: str,
    auth_token: str,
    from_number: str,
    to_number: str,
    body: str,
) -> Optional[str]:
    """Send an SMS message. Returns the message SID or None on failure."""
    client = get_twilio_client(account_sid, auth_token)
    if not client:
        print("Twilio client not configured")
        return None

    try:
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )
        return message.sid
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return None


def format_availability_message(
    restaurant_name: str,
    slot_datetime: str,
    party_size: int,
    notification_id: int,
) -> str:
    """Format an SMS message for an available reservation slot."""
    # Parse the datetime
    if "T" in slot_datetime:
        date_part, time_part = slot_datetime.split("T")
        # Format date nicely
        from datetime import datetime
        dt = datetime.strptime(slot_datetime, "%Y-%m-%dT%H:%M")
        day_name = dt.strftime("%A")
        date_nice = dt.strftime("%b %d")
        time_nice = dt.strftime("%-I:%M %p")
    else:
        day_name = ""
        date_nice = slot_datetime
        time_nice = ""

    msg = (
        f"TableSnipe found a reservation!\n\n"
        f"Restaurant: {restaurant_name}\n"
        f"Date: {day_name}, {date_nice}\n"
        f"Time: {time_nice}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES to book or NO to skip.\n"
        f"(Ref: #{notification_id})"
    )
    return msg
