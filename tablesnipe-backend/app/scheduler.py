import asyncio
import json
import logging
from datetime import datetime, timedelta

from app.database import get_db, get_setting, get_all_settings
from app.opentable import check_availability, parse_timeslots, get_opentable_url
from app.twilio_client import get_twilio_client, send_sms, format_availability_message

logger = logging.getLogger(__name__)

# Track the background task
_poll_task: asyncio.Task | None = None


async def poll_availability() -> list[dict]:
    """
    Check all enabled monitors for availability and send SMS notifications.
    Returns a list of found slots for logging purposes.
    """
    found_slots: list[dict] = []

    settings = await get_all_settings()
    auth_token = settings.get("opentable_auth_token", "")
    twilio_sid = settings.get("twilio_account_sid", "")
    twilio_token = settings.get("twilio_auth_token", "")
    twilio_from = settings.get("twilio_phone_number", "")
    user_phone = settings.get("user_phone_number", "")

    if not auth_token:
        logger.warning("OpenTable auth token not configured, skipping poll")
        return found_slots

    if not all([twilio_sid, twilio_token, twilio_from, user_phone]):
        logger.warning("Twilio settings not fully configured, skipping SMS")

    # Get all enabled monitors
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM monitors WHERE enabled = 1"
        )
        monitors = await cursor.fetchall()

    if not monitors:
        logger.info("No enabled monitors found")
        return found_slots

    now = datetime.now()

    for monitor in monitors:
        monitor_dict = dict(monitor)
        days_of_week = json.loads(monitor_dict["days_of_week"])
        weeks_ahead = monitor_dict["weeks_ahead"]
        time_start = monitor_dict["time_start"]
        time_end = monitor_dict["time_end"]
        party_size = monitor_dict["party_size"]
        restaurant_id = monitor_dict["restaurant_id"]
        restaurant_name = monitor_dict["restaurant_name"]

        # Generate dates to check based on days_of_week and weeks_ahead
        dates_to_check = []
        for week_offset in range(weeks_ahead):
            for day in days_of_week:
                # Calculate the next occurrence of this day of week
                days_ahead = (day - now.weekday()) % 7 + (week_offset * 7)
                if days_ahead == 0 and week_offset == 0:
                    # Include today if it matches
                    target_date = now.date()
                else:
                    if days_ahead == 0:
                        days_ahead = 7 * week_offset
                    target_date = (now + timedelta(days=days_ahead)).date()

                dates_to_check.append(target_date)

        # Remove duplicates and sort
        dates_to_check = sorted(set(dates_to_check))

        for target_date in dates_to_check:
            # Check with the start time
            date_time_str = f"{target_date.isoformat()}T{time_start}"

            logger.info(
                f"Checking availability: {restaurant_name} (ID: {restaurant_id}) "
                f"on {target_date} at {time_start} for {party_size} guests"
            )

            response = await check_availability(
                restaurant_id=restaurant_id,
                date_time=date_time_str,
                party_size=party_size,
                auth_token=auth_token,
            )

            if "error" in response:
                logger.error(
                    f"Error checking {restaurant_name}: {response['error']}"
                )
                continue

            slots = parse_timeslots(response)

            # Filter slots within the time window
            filtered_slots = []
            for slot in slots:
                try:
                    slot_time = datetime.fromisoformat(slot["datetime"]).time()
                    start = datetime.strptime(time_start, "%H:%M").time()
                    end = datetime.strptime(time_end, "%H:%M").time()
                    if start <= slot_time <= end:
                        filtered_slots.append(slot)
                except (ValueError, TypeError):
                    filtered_slots.append(slot)

            if not filtered_slots:
                continue

            # Check which slots we haven't already notified about
            async with get_db() as db:
                for slot in filtered_slots:
                    # Check if we already sent a notification for this slot
                    cursor = await db.execute(
                        """SELECT id FROM notifications
                        WHERE monitor_id = ? AND slot_datetime = ?
                        AND status IN ('sent', 'confirmed')""",
                        (monitor_dict["id"], slot["datetime"]),
                    )
                    existing = await cursor.fetchone()

                    if existing:
                        continue

                    # Insert notification record
                    cursor = await db.execute(
                        """INSERT INTO notifications
                        (monitor_id, restaurant_name, slot_datetime, party_size,
                         slot_hash, slot_token, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                        (
                            monitor_dict["id"],
                            restaurant_name,
                            slot["datetime"],
                            party_size,
                            slot.get("slot_hash", ""),
                            slot.get("token", ""),
                        ),
                    )
                    await db.commit()
                    notification_id = cursor.lastrowid

                    # Send SMS notification
                    if all([twilio_sid, twilio_token, twilio_from, user_phone]):
                        client = get_twilio_client(twilio_sid, twilio_token)
                        if client:
                            booking_url = get_opentable_url(
                                restaurant_id, slot["datetime"], party_size
                            )
                            message = format_availability_message(
                                restaurant_name=restaurant_name,
                                slot_datetime=slot["datetime"],
                                party_size=party_size,
                                notification_id=notification_id,
                                booking_url=booking_url,
                            )
                            sms_sid = send_sms(
                                client, twilio_from, user_phone, message
                            )
                            if sms_sid:
                                await db.execute(
                                    """UPDATE notifications
                                    SET status = 'sent', sms_sid = ?
                                    WHERE id = ?""",
                                    (sms_sid, notification_id),
                                )
                                await db.commit()
                                logger.info(
                                    f"Notification sent for {restaurant_name} "
                                    f"at {slot['datetime']}"
                                )

                    found_slots.append({
                        "restaurant_name": restaurant_name,
                        "slot_datetime": slot["datetime"],
                        "notification_id": notification_id,
                    })

    return found_slots


async def _poll_loop() -> None:
    """Background polling loop that runs every 15 minutes."""
    while True:
        try:
            logger.info("Starting availability poll...")
            results = await poll_availability()
            if results:
                logger.info(f"Found {len(results)} new available slots")
            else:
                logger.info("No new available slots found")
        except Exception as e:
            logger.error(f"Error during availability poll: {e}", exc_info=True)

        # Wait 15 minutes
        await asyncio.sleep(15 * 60)


def start_polling() -> None:
    """Start the background polling task."""
    global _poll_task
    if _poll_task is None or _poll_task.done():
        _poll_task = asyncio.create_task(_poll_loop())
        logger.info("Background polling started (every 15 minutes)")


def stop_polling() -> None:
    """Stop the background polling task."""
    global _poll_task
    if _poll_task and not _poll_task.done():
        _poll_task.cancel()
        logger.info("Background polling stopped")
        _poll_task = None
