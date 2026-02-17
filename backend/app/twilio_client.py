from twilio.rest import Client


def send_sms(
    account_sid: str,
    auth_token: str,
    from_number: str,
    to_number: str,
    body: str,
) -> str:
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body=body,
        from_=from_number,
        to=to_number,
    )
    return message.sid


def build_availability_message(
    restaurant_name: str,
    slot_datetime: str,
    party_size: int,
    notification_id: int,
) -> str:
    return (
        f"TableSnipe: {restaurant_name} has an opening!\n"
        f"Date/Time: {slot_datetime}\n"
        f"Party size: {party_size}\n\n"
        f"Reply YES {notification_id} to book, or NO {notification_id} to skip."
    )
