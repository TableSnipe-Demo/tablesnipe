import logging
import re
from fastapi import APIRouter, Form, Response
from app.database import get_db, get_all_settings
from app.opentable import lock_reservation, get_opentable_url
from app.twilio_client import get_twilio_client, send_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


@router.post("/webhook")
async def twilio_webhook(
    From: str = Form(""),
    Body: str = Form(""),
    MessageSid: str = Form(""),
):
    """
    Webhook endpoint for incoming Twilio SMS messages.
    Handles YES/NO replies for booking confirmations.
    This endpoint is public (no auth) since Twilio needs to call it.
    """
    logger.info(f"Received SMS from {From}: {Body} (SID: {MessageSid})")

    body = Body.strip().upper()

    # Parse command: "YES 123" or "NO 123"
    match = re.match(r"(YES|NO)\s+(\d+)", body)
    if not match:
        return _twiml_response(
            "Sorry, I didn't understand that. "
            "Reply YES <id> to book or NO <id> to skip."
        )

    action = match.group(1)
    notification_id = int(match.group(2))

    # Look up the notification
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM notifications WHERE id = ?", (notification_id,)
        )
        notification = await cursor.fetchone()

        if not notification:
            return _twiml_response(
                f"Notification #{notification_id} not found."
            )

        notification_dict = dict(notification)

        if notification_dict["status"] not in ("sent", "pending"):
            return _twiml_response(
                f"Notification #{notification_id} has already been "
                f"{notification_dict['status']}."
            )

        if action == "NO":
            await db.execute(
                "UPDATE notifications SET status = 'declined' WHERE id = ?",
                (notification_id,),
            )
            await db.commit()
            return _twiml_response(
                f"Got it! Skipping the reservation at "
                f"{notification_dict['restaurant_name']}."
            )

        # action == "YES" - attempt to book
        settings = await get_all_settings()
        auth_token = settings.get("opentable_auth_token", "")

        if not auth_token:
            await db.execute(
                "UPDATE notifications SET status = 'error' WHERE id = ?",
                (notification_id,),
            )
            await db.commit()
            return _twiml_response(
                "OpenTable auth token not configured. "
                "Please set it in the dashboard."
            )

        slot_hash = notification_dict["slot_hash"]
        slot_datetime = notification_dict["slot_datetime"]
        party_size = notification_dict["party_size"]
        restaurant_name = notification_dict["restaurant_name"]

        # Look up the restaurant ID from the monitor
        cursor = await db.execute(
            "SELECT restaurant_id FROM monitors WHERE id = ?",
            (notification_dict["monitor_id"],),
        )
        monitor = await cursor.fetchone()
        restaurant_id = dict(monitor)["restaurant_id"] if monitor else ""

        if slot_hash and restaurant_id:
            # Try to lock the reservation
            result = await lock_reservation(
                restaurant_id=restaurant_id,
                date_time=slot_datetime,
                party_size=party_size,
                slot_hash=slot_hash,
                auth_token=auth_token,
            )

            if "error" not in result:
                await db.execute(
                    "UPDATE notifications SET status = 'confirmed' WHERE id = ?",
                    (notification_id,),
                )
                await db.commit()
                return _twiml_response(
                    f"Reservation locked at {restaurant_name}! "
                    f"Check your OpenTable app to complete the booking."
                )

            logger.warning(f"Lock failed: {result}")

        # Fallback: provide direct booking link
        booking_url = get_opentable_url(
            restaurant_id, slot_datetime, party_size
        )
        await db.execute(
            "UPDATE notifications SET status = 'link_sent' WHERE id = ?",
            (notification_id,),
        )
        await db.commit()

        return _twiml_response(
            f"Couldn't auto-book, but here's a direct link to grab the "
            f"table at {restaurant_name}:\n{booking_url}"
        )


def _twiml_response(message: str) -> Response:
    """Return a TwiML response for Twilio."""
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")
