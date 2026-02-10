import json
import asyncio
from datetime import datetime
from app.database import get_db, get_setting
from app.services.opentable import check_availability, get_dates_for_monitor
from app.services.twilio_sms import send_reservation_alert


async def check_all_monitors():
    print(f"[{datetime.now()}] Running reservation check...")
    conn = get_db()
    monitors = conn.execute(
        "SELECT * FROM monitors WHERE active = 1"
    ).fetchall()
    conn.close()

    for monitor in monitors:
        try:
            days_of_week = json.loads(monitor["days_of_week"])
            dates = get_dates_for_monitor(days_of_week, monitor["weeks_ahead"])

            for date in dates:
                slots = await check_availability(
                    monitor["opentable_id"],
                    date,
                    monitor["time_start"],
                    monitor["party_size"],
                )

                time_start = monitor["time_start"]
                time_end = monitor["time_end"]

                for slot in slots:
                    slot_time = slot.get("time", "")
                    if "T" in slot_time:
                        slot_time_only = slot_time.split("T")[1][:5]
                    else:
                        slot_time_only = slot_time[:5]

                    if time_start <= slot_time_only <= time_end:
                        conn2 = get_db()
                        existing = conn2.execute(
                            "SELECT id FROM alerts WHERE monitor_id = ? AND date = ? AND time = ? AND status != 'denied'",
                            (monitor["id"], date, slot_time_only),
                        ).fetchone()

                        if not existing:
                            cursor = conn2.execute(
                                "INSERT INTO alerts (monitor_id, restaurant_name, date, time, party_size, status, booking_token) VALUES (?, ?, ?, ?, ?, 'notified', ?)",
                                (
                                    monitor["id"],
                                    monitor["restaurant_name"],
                                    date,
                                    slot_time_only,
                                    monitor["party_size"],
                                    slot.get("token", ""),
                                ),
                            )
                            conn2.commit()
                            alert_id = cursor.lastrowid
                            send_reservation_alert(
                                monitor["restaurant_name"],
                                date,
                                slot_time_only,
                                monitor["party_size"],
                                alert_id,
                            )
                        conn2.close()

        except Exception as e:
            print(f"Error checking monitor {monitor['id']}: {e}")

    print(f"[{datetime.now()}] Reservation check complete.")


def run_check():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(check_all_monitors())
    finally:
        loop.close()
