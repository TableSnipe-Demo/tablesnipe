import logging
from datetime import date, timedelta, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Monitor, FoundSlot, AppSettings
from app.services import opentable, twilio_sms

logger = logging.getLogger(__name__)

# Track poll status
_last_poll: Optional[datetime] = None
_monitors_checked: int = 0
_slots_found: int = 0


def get_poll_status() -> dict:
    return {
        "last_poll": _last_poll,
        "monitors_checked": _monitors_checked,
        "slots_found": _slots_found,
    }


def _get_target_dates(day_of_week: int, weeks_ahead: int) -> list[date]:
    """Calculate target dates for a given day of week, looking N weeks ahead."""
    today = date.today()
    dates: list[date] = []

    for week_offset in range(1, weeks_ahead + 1):
        days_until = (day_of_week - today.weekday()) % 7
        if days_until == 0 and week_offset == 1:
            days_until = 7
        target = today + timedelta(days=days_until + (week_offset - 1) * 7)
        dates.append(target)

    return dates


def _get_app_settings(db: Session) -> Optional[AppSettings]:
    """Get app settings from database."""
    return db.query(AppSettings).first()


async def poll_monitors():
    """Main polling function - checks all active monitors for availability."""
    global _last_poll, _monitors_checked, _slots_found

    logger.info("Starting availability poll...")
    db = SessionLocal()

    try:
        app_settings = _get_app_settings(db)
        user_phone = None
        twilio_sid = None
        twilio_token = None
        twilio_from = None

        if app_settings:
            user_phone = app_settings.user_phone
            twilio_sid = app_settings.twilio_account_sid
            twilio_token = app_settings.twilio_auth_token
            twilio_from = app_settings.twilio_phone_number

        monitors = db.query(Monitor).filter(Monitor.active.is_(True)).all()
        _monitors_checked = len(monitors)
        _slots_found = 0

        for monitor in monitors:
            target_dates = _get_target_dates(monitor.day_of_week, monitor.weeks_ahead)
            logger.info(
                f"Checking {monitor.restaurant_name} for {len(target_dates)} dates"
            )

            for target_date in target_dates:
                # Check if we already found & notified for this date+time combo
                existing = (
                    db.query(FoundSlot)
                    .filter(
                        FoundSlot.monitor_id == monitor.id,
                        FoundSlot.date == target_date.isoformat(),
                        FoundSlot.status.in_(["found", "notified", "accepted", "booked"]),
                    )
                    .first()
                )
                if existing:
                    logger.debug(
                        f"Already tracking slot for {monitor.restaurant_name} on {target_date}"
                    )
                    continue

                slots = await opentable.get_availability(
                    restaurant_id=monitor.restaurant_id,
                    target_date=target_date,
                    party_size=monitor.party_size,
                    time_start=monitor.time_start,
                    time_end=monitor.time_end,
                )

                for slot in slots:
                    _slots_found += 1
                    logger.info(
                        f"Found slot: {monitor.restaurant_name} on {target_date} at {slot.time}"
                    )

                    found_slot = FoundSlot(
                        monitor_id=monitor.id,
                        date=target_date.isoformat(),
                        time=slot.time,
                        party_size=monitor.party_size,
                        booking_token=slot.booking_token,
                        booking_url=slot.booking_url,
                        status="found",
                    )
                    db.add(found_slot)
                    db.commit()
                    db.refresh(found_slot)

                    # Send SMS notification if configured
                    if user_phone and twilio_sid and twilio_token and twilio_from:
                        sms_sid = twilio_sms.send_slot_notification(
                            to_phone=user_phone,
                            restaurant_name=monitor.restaurant_name,
                            slot_date=target_date.isoformat(),
                            slot_time=slot.time,
                            party_size=monitor.party_size,
                            booking_url=slot.booking_url,
                            slot_id=found_slot.id,
                            from_phone=twilio_from,
                            account_sid=twilio_sid,
                            auth_token=twilio_token,
                        )
                        if sms_sid:
                            found_slot.status = "notified"
                            found_slot.sms_sid = sms_sid
                            found_slot.notified_at = datetime.now(timezone.utc)
                            db.commit()
                    else:
                        logger.warning(
                            "SMS not configured - slot found but not notified"
                        )

        _last_poll = datetime.now(timezone.utc)
        logger.info(
            f"Poll complete. Checked {_monitors_checked} monitors, found {_slots_found} slots."
        )

    except Exception as e:
        logger.error(f"Poll error: {e}", exc_info=True)
    finally:
        db.close()
