import logging
import re
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FoundSlot, AppSettings
from app.services.twilio_sms import send_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/twilio")
async def twilio_incoming(request: Request, db: Session = Depends(get_db)):
    """Handle incoming SMS replies from Twilio.

    Expected reply format:
    - "YES <slot_id>" to confirm a booking
    - "NO <slot_id>" to decline
    - "YES" to confirm the most recent notification
    - "NO" to decline the most recent notification
    """
    form = await request.form()
    body = str(form.get("Body", "")).strip().upper()
    from_number = str(form.get("From", ""))

    logger.info(f"Incoming SMS from {from_number}: {body}")

    # Parse the reply
    match = re.match(r"(YES|NO)\s*(\d+)?", body)
    if not match:
        # Send help message
        _reply_sms(
            db,
            from_number,
            "Reply YES <id> to confirm a reservation, or NO <id> to skip it.",
        )
        return _twiml_response()

    action = match.group(1)
    slot_id_str = match.group(2)

    # Find the slot
    if slot_id_str:
        slot = db.query(FoundSlot).filter(FoundSlot.id == int(slot_id_str)).first()
    else:
        # Get the most recent notified slot
        slot = (
            db.query(FoundSlot)
            .filter(FoundSlot.status == "notified")
            .order_by(FoundSlot.notified_at.desc())
            .first()
        )

    if not slot:
        _reply_sms(db, from_number, "Couldn't find that reservation. Please check the ID and try again.")
        return _twiml_response()

    if action == "YES":
        slot.status = "accepted"
        db.commit()

        reply_msg = (
            f"Confirmed! Here's your booking link:\n"
            f"{slot.booking_url}\n\n"
            f"Open it to complete your reservation."
        )
        _reply_sms(db, from_number, reply_msg)
        logger.info(f"Slot {slot.id} accepted by user")

    elif action == "NO":
        slot.status = "declined"
        db.commit()

        _reply_sms(db, from_number, f"Got it, skipping that reservation. We'll keep looking!")
        logger.info(f"Slot {slot.id} declined by user")

    return _twiml_response()


def _reply_sms(db: Session, to_phone: str, message: str):
    """Send a reply SMS using configured Twilio credentials."""
    settings = db.query(AppSettings).first()
    if settings and settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_phone_number:
        send_sms(
            to_phone=to_phone,
            message=message,
            from_phone=settings.twilio_phone_number,
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
        )


def _twiml_response() -> Response:
    """Return an empty TwiML response."""
    twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    return Response(content=twiml, media_type="application/xml")
