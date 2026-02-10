import asyncio
import logging
from fastapi import APIRouter, Form, Request, HTTPException
from fastapi.responses import Response
from xml.sax.saxutils import escape
from twilio.request_validator import RequestValidator
from app.database import get_db
from app.sms import send_sms, get_twilio_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


@router.post("/webhook")
async def twilio_webhook(
    request: Request,
    Body: str = Form(""),
    From: str = Form(""),
):
    settings = get_twilio_settings()
    auth_token = settings.get("twilio_auth_token", "")
    if auth_token:
        validator = RequestValidator(auth_token)
        signature = request.headers.get("X-Twilio-Signature", "")
        form_data = dict(await request.form())
        url = str(request.url)
        if not validator.validate(url, form_data, signature):
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    body = Body.strip().upper()
    logger.info(f"Received SMS from {From}: {body}")

    parts = body.split()
    if len(parts) < 2:
        return _twiml_response(
            "Please reply with YES <booking_id> or NO <booking_id>"
        )

    action = parts[0]
    try:
        booking_id = int(parts[1])
    except (ValueError, IndexError):
        return _twiml_response(
            "Please reply with YES <booking_id> or NO <booking_id>"
        )

    with get_db() as db:
        booking = db.execute(
            "SELECT * FROM bookings WHERE id = ?", (booking_id,)
        ).fetchone()

    if not booking:
        return _twiml_response(f"Booking #{booking_id} not found.")

    if booking["status"] != "notified":
        return _twiml_response(
            f"Booking #{booking_id} already {booking['status']}."
        )

    if action == "YES":
        with get_db() as db:
            db.execute(
                "UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?",
                (booking_id,),
            )
        reply = (
            f"Confirmed! Booking #{booking_id} at {booking['restaurant_name']} "
            f"on {booking['date']} at {booking['time']} for {booking['party_size']}."
        )
        settings = get_twilio_settings()
        user_phone = settings.get("user_phone_number", "")
        if user_phone:
            await asyncio.to_thread(send_sms, user_phone, reply)
        return _twiml_response(reply)

    elif action == "NO":
        with get_db() as db:
            db.execute(
                "UPDATE bookings SET status = 'denied', updated_at = datetime('now') WHERE id = ?",
                (booking_id,),
            )
        return _twiml_response(f"Skipped booking #{booking_id}.")

    return _twiml_response(
        "Please reply with YES <booking_id> or NO <booking_id>"
    )


def _twiml_response(message: str) -> Response:
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{escape(message)}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")
