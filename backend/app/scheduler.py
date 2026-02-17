import asyncio
import datetime
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import Monitor, Notification, AvailabilityLog, Settings
from app.opentable import check_availability, get_target_dates
from app.twilio_client import send_sms, build_availability_message

logger = logging.getLogger("tablesnipe.scheduler")


async def poll_all_monitors():
    logger.info("Starting availability poll for all monitors")
    async with async_session() as db:
        settings_result = await db.execute(select(Settings).where(Settings.id == 1))
        settings = settings_result.scalar_one_or_none()
        if not settings or not settings.opentable_auth_token:
            logger.warning("No OpenTable auth token configured, skipping poll")
            return

        monitors_result = await db.execute(
            select(Monitor).where(Monitor.active == True)
        )
        monitors = monitors_result.scalars().all()

        if not monitors:
            logger.info("No active monitors found")
            return

        for monitor in monitors:
            try:
                await poll_single_monitor(db, monitor, settings)
            except Exception as e:
                logger.error(f"Error polling monitor {monitor.id}: {e}")

        await db.commit()


async def poll_single_monitor(
    db: AsyncSession, monitor: Monitor, settings: Settings
):
    target_dates = get_target_dates(monitor.target_day_of_week, monitor.weeks_ahead)
    logger.info(
        f"Polling monitor {monitor.id} ({monitor.restaurant_name}) "
        f"for dates: {target_dates}"
    )

    for date_str in target_dates:
        date_time = f"{date_str}T{monitor.target_time}"

        result = await check_availability(
            restaurant_id=monitor.restaurant_id,
            date_time=date_time,
            party_size=monitor.party_size,
            auth_token=settings.opentable_auth_token,
        )

        log = AvailabilityLog(
            monitor_id=monitor.id,
            date_checked=date_str,
            slots_found=len(result.timeslots),
            error=result.error,
        )
        db.add(log)

        if result.error:
            logger.warning(
                f"Error checking {monitor.restaurant_name} on {date_str}: {result.error}"
            )
            continue

        if not result.timeslots:
            logger.info(f"No availability for {monitor.restaurant_name} on {date_str}")
            continue

        for slot in result.timeslots:
            existing = await db.execute(
                select(Notification).where(
                    Notification.monitor_id == monitor.id,
                    Notification.slot_hash == slot.slot_hash,
                    Notification.status.in_(["pending", "confirmed"]),
                )
            )
            if existing.scalar_one_or_none():
                continue

            notification = Notification(
                monitor_id=monitor.id,
                slot_datetime=slot.date_time,
                slot_hash=slot.slot_hash,
                slot_token=slot.token,
                dining_area_id=slot.dining_area_id,
                table_attribute=slot.table_attribute,
                status="pending",
            )
            db.add(notification)
            await db.flush()

            if (
                settings.twilio_account_sid
                and settings.twilio_auth_token
                and settings.twilio_phone_number
                and settings.user_phone_number
            ):
                try:
                    message_body = build_availability_message(
                        restaurant_name=monitor.restaurant_name,
                        slot_datetime=slot.date_time,
                        party_size=monitor.party_size,
                        notification_id=notification.id,
                    )
                    sid = send_sms(
                        account_sid=settings.twilio_account_sid,
                        auth_token=settings.twilio_auth_token,
                        from_number=settings.twilio_phone_number,
                        to_number=settings.user_phone_number,
                        body=message_body,
                    )
                    notification.twilio_message_sid = sid
                    logger.info(
                        f"Sent SMS for {monitor.restaurant_name} "
                        f"slot {slot.date_time} (notification {notification.id})"
                    )
                except Exception as e:
                    logger.error(f"Failed to send SMS: {e}")
            else:
                logger.warning("Twilio not configured, skipping SMS notification")

        await asyncio.sleep(1)


def run_poll():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(poll_all_monitors())
    finally:
        loop.close()
