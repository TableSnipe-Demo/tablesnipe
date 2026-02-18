import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Monitor, Notification, Settings
from app.opentable import check_availability, get_target_dates
from app.sms import format_availability_message, get_twilio_client, send_sms

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def get_settings(db: Session) -> dict[str, str]:
    """Load all settings from the database."""
    settings = db.query(Settings).all()
    return {s.key: s.value for s in settings}


def poll_reservations():
    """Main polling job: check all active monitors for availability."""
    logger.info("Starting reservation poll...")
    db = SessionLocal()
    try:
        monitors = db.query(Monitor).filter(Monitor.is_active == True).all()
        if not monitors:
            logger.info("No active monitors to check")
            return

        settings = get_settings(db)
        twilio_sid = settings.get("twilio_account_sid", "")
        twilio_token = settings.get("twilio_auth_token", "")
        from_number = settings.get("twilio_from_number", "")
        to_number = settings.get("twilio_to_number", "")
        bearer_token = settings.get("opentable_bearer_token", "")

        if not all([twilio_sid, twilio_token, from_number, to_number]):
            logger.warning("Twilio settings not configured, skipping SMS notifications")
            twilio_client = None
        else:
            twilio_client = get_twilio_client(twilio_sid, twilio_token)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        for monitor in monitors:
            try:
                _check_monitor(db, monitor, bearer_token, twilio_client, from_number, to_number, loop)
            except Exception as e:
                logger.error(f"Error checking monitor {monitor.id}: {e}")

        loop.close()
        db.commit()
    except Exception as e:
        logger.error(f"Error in poll_reservations: {e}")
        db.rollback()
    finally:
        db.close()
    logger.info("Reservation poll complete")


def _check_monitor(
    db: Session,
    monitor: Monitor,
    bearer_token: str,
    twilio_client: object | None,
    from_number: str,
    to_number: str,
    loop: asyncio.AbstractEventLoop,
):
    """Check a single monitor for availability and send notifications."""
    target_dates = get_target_dates(monitor.days_of_week, monitor.weeks_ahead)
    logger.info(
        f"Checking monitor {monitor.id} ({monitor.restaurant_name}) for {len(target_dates)} dates"
    )

    for date_str in target_dates:
        # Check if we already have a pending notification for this date/restaurant
        existing = (
            db.query(Notification)
            .filter(
                Notification.monitor_id == monitor.id,
                Notification.slot_datetime.like(f"{date_str}%"),
                Notification.status.in_(["pending", "confirmed"]),
            )
            .first()
        )
        if existing:
            logger.debug(f"Already have pending notification for {date_str}, skipping")
            continue

        slots = loop.run_until_complete(
            check_availability(
                restaurant_id=monitor.restaurant_id,
                date_str=date_str,
                time_str=monitor.target_time,
                party_size=monitor.party_size,
                bearer_token=bearer_token if bearer_token else None,
            )
        )

        if slots:
            logger.info(f"Found {len(slots)} slots for {monitor.restaurant_name} on {date_str}")
            # Take the best slot (closest to target time)
            best_slot = slots[0]

            # Create notification
            notification = Notification(
                monitor_id=monitor.id,
                restaurant_name=monitor.restaurant_name,
                restaurant_id=monitor.restaurant_id,
                slot_datetime=best_slot["dateTime"],
                slot_hash=best_slot["slotHash"],
                slot_token=best_slot.get("token", ""),
                party_size=monitor.party_size,
                status="pending",
            )
            db.add(notification)
            db.flush()

            # Send SMS notification
            if twilio_client:
                message_body = format_availability_message(
                    restaurant_name=monitor.restaurant_name,
                    slot_datetime=best_slot["dateTime"],
                    party_size=monitor.party_size,
                    notification_id=notification.id,
                )
                sms_sid = send_sms(twilio_client, from_number, to_number, message_body)
                if sms_sid:
                    notification.sms_sid = sms_sid
                    logger.info(f"Sent SMS notification {sms_sid} for {monitor.restaurant_name}")

            db.commit()


def start_scheduler():
    """Start the background scheduler with 15-minute polling interval."""
    if not scheduler.running:
        scheduler.add_job(
            poll_reservations,
            "interval",
            minutes=15,
            id="poll_reservations",
            replace_existing=True,
            next_run_time=None,  # Don't run immediately on start
        )
        scheduler.start()
        logger.info("Scheduler started - polling every 15 minutes")


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")


def trigger_poll_now():
    """Manually trigger a poll immediately."""
    poll_reservations()
