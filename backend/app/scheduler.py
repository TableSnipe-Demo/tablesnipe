import asyncio
import json
import logging
from datetime import datetime

from app.database import get_db
from app.opentable import check_availability, parse_available_slots, generate_check_dates
from app.sms import send_sms, format_slot_message

logger = logging.getLogger(__name__)


async def poll_availability():
    """Main polling function - checks all enabled monitors for availability."""
    logger.info("Starting availability poll...")

    with get_db() as conn:
        settings = dict(conn.execute("SELECT * FROM settings WHERE id = 1").fetchone())

    bearer_token = settings.get("opentable_bearer_token", "")
    if not bearer_token:
        logger.warning("No OpenTable bearer token configured, skipping poll")
        return

    twilio_configured = all([
        settings.get("twilio_account_sid"),
        settings.get("twilio_auth_token"),
        settings.get("twilio_phone_number"),
        settings.get("user_phone_number"),
    ])

    with get_db() as conn:
        monitors = conn.execute("""
            SELECT m.*, r.opentable_id, r.name as restaurant_name
            FROM monitors m
            JOIN restaurants r ON m.restaurant_id = r.id
            WHERE m.enabled = 1
        """).fetchall()

    if not monitors:
        logger.info("No enabled monitors found")
        return

    total_new_slots = 0

    for monitor in monitors:
        monitor = dict(monitor)
        days_of_week = json.loads(monitor["days_of_week"])
        if not days_of_week:
            continue

        check_dates = generate_check_dates(
            days_of_week=days_of_week,
            time_start=monitor["time_start"],
            time_end=monitor["time_end"],
            weeks_ahead=monitor["weeks_ahead"],
        )

        for dt_str in check_dates:
            try:
                response = await check_availability(
                    restaurant_opentable_id=monitor["opentable_id"],
                    date_time=dt_str,
                    party_size=monitor["party_size"],
                    bearer_token=bearer_token,
                )

                if "error" in response:
                    logger.error(f"Error checking {monitor['restaurant_name']} at {dt_str}: {response['error']}")
                    continue

                available_slots = parse_available_slots(response)

                for slot in available_slots:
                    with get_db() as conn:
                        # Check if we already know about this slot
                        existing = conn.execute(
                            """SELECT id FROM found_slots
                            WHERE monitor_id = ? AND restaurant_id = ? AND date_time = ? AND party_size = ?""",
                            (monitor["id"], monitor["restaurant_id"], slot["dateTime"], monitor["party_size"]),
                        ).fetchone()

                        if existing:
                            continue

                        # Insert new slot
                        cursor = conn.execute(
                            """INSERT INTO found_slots (monitor_id, restaurant_id, date_time, party_size, slot_hash, slot_token, status)
                            VALUES (?, ?, ?, ?, ?, ?, 'found')""",
                            (
                                monitor["id"],
                                monitor["restaurant_id"],
                                slot["dateTime"],
                                monitor["party_size"],
                                slot.get("slotHash", ""),
                                slot.get("token", ""),
                            ),
                        )
                        slot_id = cursor.lastrowid
                        total_new_slots += 1

                        # Send SMS notification if Twilio is configured
                        if twilio_configured:
                            msg = format_slot_message(
                                restaurant_name=monitor["restaurant_name"],
                                date_time=slot["dateTime"],
                                party_size=monitor["party_size"],
                                slot_id=slot_id,
                            )
                            twilio_sid = send_sms(
                                to_number=settings["user_phone_number"],
                                from_number=settings["twilio_phone_number"],
                                body=msg,
                                account_sid=settings["twilio_account_sid"],
                                auth_token=settings["twilio_auth_token"],
                            )
                            conn.execute(
                                """INSERT INTO notifications (slot_id, message, status, twilio_sid)
                                VALUES (?, ?, ?, ?)""",
                                (slot_id, msg, "sent" if twilio_sid else "failed", twilio_sid or ""),
                            )

                # Small delay between API calls to be nice
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error processing {monitor['restaurant_name']} at {dt_str}: {e}")
                continue

    logger.info(f"Poll complete. Found {total_new_slots} new slots.")
