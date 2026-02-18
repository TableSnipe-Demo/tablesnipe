from twilio.rest import Client
from typing import Optional


def get_twilio_client(account_sid: str, auth_token: str) -> Optional[Client]:
    """Create a Twilio client with the given credentials."""
    if not account_sid or not auth_token:
        return None
    try:
        return Client(account_sid, auth_token)
    except Exception as e:
        print(f"Twilio client error: {e}")
        return None


def send_sms(
    client: Client,
    from_number: str,
    to_number: str,
    message: str,
) -> bool:
    """Send an SMS using Twilio."""
    try:
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number,
        )
        print(f"SMS sent: {msg.sid}")
        return True
    except Exception as e:
        print(f"SMS send error: {e}")
        return False


def build_slot_notification(restaurant_name: str, date: str, time: str, party_size: int, slot_id: int) -> str:
    """Build the SMS notification message for a found slot."""
    return (
        f"🍽️ TableSnipe found a reservation!\n\n"
        f"Restaurant: {restaurant_name}\n"
        f"Date: {date}\n"
        f"Time: {time}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES to confirm or NO to skip.\n"
        f"(Ref: #{slot_id})"
    )
