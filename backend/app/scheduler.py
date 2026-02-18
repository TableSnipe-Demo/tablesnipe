import asyncio
import json
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import (
    get_monitors,
    get_settings,
    create_found_slot,
    check_slot_already_found,
    mark_slot_notified,
)
from app.opentable import check_availability, get_dates_for_monitor, filter_slots_by_time
from app.sms import get_twilio_client, send_sms, build_slot_notification

scheduler = AsyncIOScheduler()


async def check_all_monitors():
    """Check availability for all active monitors."""
    print(f"[{datetime.now()}] Running availability check for all monitors...")

    monitors = get_monitors()
    settings = get_settings()

    bearer_token = settings.get("opentable_bearer_token", "")
    twilio_sid = settings.get("twilio_account_sid", "")
    twilio_token = settings.get("twilio_auth_token", "")
    twilio_phone = settings.get("twilio_phone_number", "")
    user_phone = settings.get("user_phone_number", "")

    twilio_client = None
    if twilio_sid and twilio_token:
        twilio_client = get_twilio_client(twilio_sid, twilio_token)

    for monitor in monitors:
        if not monitor.get("active"):
            continue

        days_of_week = json.loads(monitor.get("days_of_week", "[]"))
        if not days_of_week:
            continue

        dates = get_dates_for_monitor(days_of_week, monitor.get("weeks_ahead", 4))
        time_start = monitor.get("time_start", "18:00")
        time_end = monitor.get("time_end", "21:00")
        mid_time = time_start  # Use start time as the query time

        for date_str in dates:
            try:
                slots = await check_availability(
                    restaurant_id=monitor["restaurant_id"],
                    date_str=date_str,
                    time_str=mid_time,
                    party_size=monitor["party_size"],
                    bearer_token=bearer_token,
                )

                filtered = filter_slots_by_time(slots, time_start, time_end)

                for slot in filtered:
                    slot_date = slot["date"]
                    slot_time = slot["time"]

                    if check_slot_already_found(monitor["id"], slot_date, slot_time):
                        continue

                    found = create_found_slot({
                        "monitor_id": monitor["id"],
                        "restaurant_name": monitor["restaurant_name"],
                        "date": slot_date,
                        "time": slot_time,
                        "party_size": monitor["party_size"],
                        "slot_token": slot.get("token", ""),
                        "slot_hash": slot.get("hash", ""),
                        "status": "found",
                    })

                    if twilio_client and twilio_phone and user_phone:
                        msg = build_slot_notification(
                            restaurant_name=monitor["restaurant_name"],
                            date=slot_date,
                            time=slot_time,
                            party_size=monitor["party_size"],
                            slot_id=found["id"],
                        )
                        sent = send_sms(twilio_client, twilio_phone, user_phone, msg)
                        if sent:
                            mark_slot_notified(found["id"])
                            print(f"  Notified user about slot at {monitor['restaurant_name']} on {slot_date} {slot_time}")

            except Exception as e:
                print(f"  Error checking {monitor['restaurant_name']} on {date_str}: {e}")

    print(f"[{datetime.now()}] Availability check complete.")


def start_scheduler():
    """Start the background scheduler that polls every 15 minutes."""
    scheduler.add_job(
        check_all_monitors,
        "interval",
        minutes=15,
        id="check_availability",
        replace_existing=True,
        next_run_time=None,  # Don't run immediately on startup
    )
    scheduler.start()
    print("Scheduler started - polling every 15 minutes")


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("Scheduler stopped")
