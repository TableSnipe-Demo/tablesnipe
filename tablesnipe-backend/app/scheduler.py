import asyncio
import json
from datetime import datetime
from app.database import get_db, row_to_dict
from app.opentable import check_availability_range, get_dates_for_monitor
from app.twilio_service import send_sms, format_availability_message


async def poll_all_monitors():
    """Poll all active monitors for availability and send notifications."""
    print(f"[{datetime.now().isoformat()}] Starting poll cycle...")

    db = await get_db()
    try:
        # Get settings
        cursor = await db.execute("SELECT * FROM settings WHERE id = 1")
        settings_row = await cursor.fetchone()
        if not settings_row:
            print("No settings configured, skipping poll")
            return
        settings = dict(settings_row)

        twilio_sid = settings.get("twilio_account_sid", "")
        twilio_token = settings.get("twilio_auth_token", "")
        twilio_from = settings.get("twilio_phone_number", "")
        user_phone = settings.get("user_phone_number", "")

        twilio_configured = all([twilio_sid, twilio_token, twilio_from, user_phone])

        # Get active monitors
        cursor = await db.execute("SELECT * FROM monitors WHERE active = 1")
        monitors = await cursor.fetchall()

        if not monitors:
            print("No active monitors, skipping poll")
            return

        for monitor_row in monitors:
            monitor = row_to_dict(monitor_row)
            monitor_id = monitor["id"]
            restaurant_id = monitor["restaurant_id"]
            restaurant_name = monitor["restaurant_name"]
            party_size = monitor["party_size"]
            days_of_week = monitor["days_of_week"]
            time_start = monitor["time_start"]
            time_end = monitor["time_end"]
            weeks_ahead = monitor["weeks_ahead"]

            print(f"  Checking: {restaurant_name} (ID: {restaurant_id})")

            # Get dates to check
            dates = get_dates_for_monitor(days_of_week, weeks_ahead)
            total_slots_found = 0
            error_msg = ""

            for date_str in dates:
                try:
                    slots = await check_availability_range(
                        restaurant_id=restaurant_id,
                        date_str=date_str,
                        time_start=time_start,
                        time_end=time_end,
                        party_size=party_size,
                    )

                    for slot in slots:
                        slot_dt = slot["dateTime"]
                        slot_hash = slot.get("slotHash", "")
                        slot_token = slot.get("token", "")

                        # Check if we already notified about this slot
                        cursor = await db.execute(
                            """SELECT id FROM notifications
                               WHERE monitor_id = ? AND slot_datetime = ?
                               AND status IN ('pending', 'confirmed')""",
                            (monitor_id, slot_dt),
                        )
                        existing = await cursor.fetchone()
                        if existing:
                            continue

                        # Create notification record
                        cursor = await db.execute(
                            """INSERT INTO notifications
                               (monitor_id, restaurant_name, slot_datetime, party_size, slot_hash, slot_token, status)
                               VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                            (monitor_id, restaurant_name, slot_dt, party_size, slot_hash, slot_token),
                        )
                        await db.commit()
                        notification_id = cursor.lastrowid

                        total_slots_found += 1

                        # Send SMS if Twilio is configured
                        if twilio_configured:
                            msg = format_availability_message(
                                restaurant_name=restaurant_name,
                                slot_datetime=slot_dt,
                                party_size=party_size,
                                notification_id=notification_id,
                            )
                            sms_sid = send_sms(
                                account_sid=twilio_sid,
                                auth_token=twilio_token,
                                from_number=twilio_from,
                                to_number=user_phone,
                                body=msg,
                            )
                            if sms_sid:
                                await db.execute(
                                    "UPDATE notifications SET sms_sid = ? WHERE id = ?",
                                    (sms_sid, notification_id),
                                )
                                await db.commit()
                                print(f"    Sent SMS for {restaurant_name} at {slot_dt}")
                        else:
                            print(f"    Found slot: {restaurant_name} at {slot_dt} (Twilio not configured)")

                    # Small delay between date checks to be nice to the API
                    await asyncio.sleep(0.5)

                except Exception as e:
                    error_msg = str(e)
                    print(f"    Error checking {date_str}: {e}")

            # Log the poll
            await db.execute(
                """INSERT INTO poll_log (monitor_id, slots_found, error)
                   VALUES (?, ?, ?)""",
                (monitor_id, total_slots_found, error_msg),
            )
            await db.commit()

            # Small delay between monitors
            await asyncio.sleep(1)

        print(f"[{datetime.now().isoformat()}] Poll cycle complete")

    except Exception as e:
        print(f"Error during poll cycle: {e}")
    finally:
        await db.close()
