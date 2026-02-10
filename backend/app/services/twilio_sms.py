from twilio.rest import Client
from app.database import get_setting


def get_twilio_client():
    sid = get_setting("twilio_sid")
    token = get_setting("twilio_token")
    if not sid or not token:
        return None
    return Client(sid, token)


def send_sms(to: str, body: str) -> bool:
    client = get_twilio_client()
    if not client:
        return False
    from_phone = get_setting("twilio_phone")
    if not from_phone:
        return False
    try:
        client.messages.create(
            body=body,
            from_=from_phone,
            to=to,
        )
        return True
    except Exception as e:
        print(f"SMS send error: {e}")
        return False


def send_reservation_alert(restaurant_name: str, date: str, time: str, party_size: int, alert_id: int) -> bool:
    user_phone = get_setting("user_phone")
    if not user_phone:
        return False
    body = (
        f"TableSnipe: Found a reservation at {restaurant_name} "
        f"on {date} at {time} for {party_size}! "
        f"Reply 'YES {alert_id}' to book or 'NO {alert_id}' to skip."
    )
    return send_sms(user_phone, body)
