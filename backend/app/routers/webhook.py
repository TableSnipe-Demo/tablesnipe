import asyncio
import datetime
import logging
import re

from fastapi import APIRouter, Depends, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Notification, Monitor, Settings
from app.opentable import lock_reservation, complete_reservation
from app.twilio_client import send_sms

logger = logging.getLogger("tablesnipe.webhook")

router = APIRouter(prefix="/api/twilio", tags=["twilio"])


@router.post("/webhook", response_class=PlainTextResponse)
async def twilio_webhook(
    Body: str = Form(""),
    From: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    body = Body.strip().upper()
    logger.info(f"Received SMS from {From}: {body}")

    match = re.match(r"(YES|NO)\s+(\d+)", body)
    if not match:
        return "Reply with YES <id> or NO <id> to respond to a reservation notification."

    action = match.group(1)
    notification_id = int(match.group(2))

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        return f"Notification #{notification_id} not found."

    if notification.status != "pending":
        return f"Notification #{notification_id} already {notification.status}."

    settings_result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = settings_result.scalar_one_or_none()

    monitor_result = await db.execute(
        select(Monitor).where(Monitor.id == notification.monitor_id)
    )
    monitor = monitor_result.scalar_one_or_none()

    if action == "NO":
        notification.status = "denied"
        notification.responded_at = datetime.datetime.utcnow()
        await db.commit()

        if settings and monitor:
            await _send_reply(
                settings,
                f"Got it! Skipping {monitor.restaurant_name} at {notification.slot_datetime}.",
            )
        return "Reservation declined."

    if not settings or not settings.opentable_auth_token:
        return "OpenTable auth token not configured. Cannot book."

    if not monitor:
        return "Monitor not found for this notification."

    try:
        lock_data = await lock_reservation(
            restaurant_id=monitor.restaurant_id,
            date_time=notification.slot_datetime,
            party_size=monitor.party_size,
            slot_hash=notification.slot_hash,
            dining_area_id=notification.dining_area_id,
            table_attribute=notification.table_attribute,
            auth_token=settings.opentable_auth_token,
        )

        lock_id = str(lock_data.get("id", ""))

        await complete_reservation(
            reservation_lock_id=lock_id,
            restaurant_id=monitor.restaurant_id,
            date_time=notification.slot_datetime,
            party_size=monitor.party_size,
            slot_hash=notification.slot_hash,
            slot_token=notification.slot_token,
            dining_area_id=notification.dining_area_id,
            table_attribute=notification.table_attribute,
            phone_number=settings.user_phone_number,
            auth_token=settings.opentable_auth_token,
        )

        notification.status = "confirmed"
        notification.responded_at = datetime.datetime.utcnow()
        await db.commit()

        await _send_reply(
            settings,
            f"Booked! {monitor.restaurant_name} at {notification.slot_datetime} "
            f"for {monitor.party_size}. Check OpenTable for details.",
        )
        return "Reservation booked!"

    except Exception as e:
        logger.error(f"Booking failed for notification {notification_id}: {e}")
        notification.status = "failed"
        notification.responded_at = datetime.datetime.utcnow()
        await db.commit()

        await _send_reply(
            settings,
            f"Booking failed for {monitor.restaurant_name}: {e}. "
            "The slot may no longer be available.",
        )
        return f"Booking failed: {e}"


async def _send_reply(settings: Settings, message: str):
    if (
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_phone_number
        and settings.user_phone_number
    ):
        try:
            await asyncio.to_thread(
                send_sms,
                account_sid=settings.twilio_account_sid,
                auth_token=settings.twilio_auth_token,
                from_number=settings.twilio_phone_number,
                to_number=settings.user_phone_number,
                body=message,
            )
        except Exception as e:
            logger.error(f"Failed to send reply SMS: {e}")
