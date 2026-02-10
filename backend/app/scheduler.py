import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import get_db
from app.opentable import check_availability, get_upcoming_dates
from app.sms import send_availability_notification

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def check_monitors():
    logger.info("Running scheduled availability check...")
    with get_db() as db:
        monitors = db.execute(
            "SELECT * FROM monitors WHERE active = 1"
        ).fetchall()

    for monitor in monitors:
        monitor_id = monitor["id"]
        restaurant_id = monitor["restaurant_id"]
        restaurant_name = monitor["restaurant_name"]
        day_of_week = monitor["day_of_week"]
        time_of_day = monitor["time_of_day"]
        party_size = monitor["party_size"]
        weeks_ahead = monitor["weeks_ahead"]

        dates = get_upcoming_dates(day_of_week, weeks_ahead)
        logger.info(
            f"Checking {restaurant_name} for {len(dates)} upcoming {day_of_week}s"
        )

        for date in dates:
            with get_db() as db:
                existing = db.execute(
                    "SELECT id FROM bookings WHERE monitor_id = ? AND date = ? AND status IN ('notified', 'confirmed')",
                    (monitor_id, date),
                ).fetchone()
            if existing:
                continue

            slots = await check_availability(
                restaurant_id, date, time_of_day, party_size
            )

            if slots:
                slot = slots[0]
                slot_time = slot["datetime"]
                if "T" in slot_time:
                    display_time = slot_time.split("T")[1][:5]
                else:
                    display_time = time_of_day

                with get_db() as db:
                    cursor = db.execute(
                        "INSERT INTO bookings (monitor_id, restaurant_name, restaurant_id, date, time, party_size, status, slot_token) VALUES (?, ?, ?, ?, ?, ?, 'notified', ?)",
                        (
                            monitor_id,
                            restaurant_name,
                            restaurant_id,
                            date,
                            display_time,
                            party_size,
                            slot.get("token", ""),
                        ),
                    )
                    booking_id = cursor.lastrowid

                await asyncio.to_thread(
                    send_availability_notification,
                    booking_id, restaurant_name, date, display_time, party_size,
                )
                logger.info(
                    f"Notified: {restaurant_name} on {date} at {display_time}"
                )

            await asyncio.sleep(1)


def start_scheduler():
    scheduler.add_job(
        check_monitors,
        "interval",
        minutes=15,
        id="check_monitors",
        replace_existing=True,
        next_run_time=datetime.now(),
    )
    scheduler.start()
    logger.info("Scheduler started - checking every 15 minutes")


def stop_scheduler():
    scheduler.shutdown(wait=False)
