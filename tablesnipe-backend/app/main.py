import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, init_db
from app.models import Monitor, Notification, Settings
from app.opentable import (
    search_restaurants,
    check_availability,
    lock_reservation,
    complete_reservation,
)
from app.sms import get_twilio_client, send_sms
from app.scheduler import start_scheduler, stop_scheduler, trigger_poll_now

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="TableSnipe", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# ─── Pydantic Schemas ───


class MonitorCreate(BaseModel):
    restaurant_name: str
    restaurant_id: str
    party_size: int = 2
    target_time: str = "19:00"
    days_of_week: list[int]  # 1=Mon, 7=Sun
    weeks_ahead: int = 4


class MonitorUpdate(BaseModel):
    restaurant_name: str | None = None
    restaurant_id: str | None = None
    party_size: int | None = None
    target_time: str | None = None
    days_of_week: list[int] | None = None
    weeks_ahead: int | None = None
    is_active: bool | None = None


class SettingsUpdate(BaseModel):
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    twilio_to_number: str | None = None
    opentable_bearer_token: str | None = None


# ─── Health Check ───


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ─── Restaurant Search ───


@app.get("/api/restaurants/search")
async def api_search_restaurants(q: str):
    """Search OpenTable for restaurants by name."""
    if len(q) < 2:
        return {"restaurants": []}
    results = await search_restaurants(q)
    return {"restaurants": results}


# ─── Monitor CRUD ───


@app.get("/api/monitors")
def list_monitors(db: Session = Depends(get_db)):
    monitors = db.query(Monitor).order_by(Monitor.created_at.desc()).all()
    return {
        "monitors": [
            {
                "id": m.id,
                "restaurant_name": m.restaurant_name,
                "restaurant_id": m.restaurant_id,
                "party_size": m.party_size,
                "target_time": m.target_time,
                "days_of_week": m.days_of_week,
                "weeks_ahead": m.weeks_ahead,
                "is_active": m.is_active,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in monitors
        ]
    }


@app.post("/api/monitors")
def create_monitor(data: MonitorCreate, db: Session = Depends(get_db)):
    monitor = Monitor(
        restaurant_name=data.restaurant_name,
        restaurant_id=data.restaurant_id,
        party_size=data.party_size,
        target_time=data.target_time,
        days_of_week=data.days_of_week,
        weeks_ahead=data.weeks_ahead,
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return {
        "id": monitor.id,
        "restaurant_name": monitor.restaurant_name,
        "restaurant_id": monitor.restaurant_id,
        "party_size": monitor.party_size,
        "target_time": monitor.target_time,
        "days_of_week": monitor.days_of_week,
        "weeks_ahead": monitor.weeks_ahead,
        "is_active": monitor.is_active,
    }


@app.put("/api/monitors/{monitor_id}")
def update_monitor(monitor_id: int, data: MonitorUpdate, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(monitor, key, value)

    db.commit()
    db.refresh(monitor)
    return {
        "id": monitor.id,
        "restaurant_name": monitor.restaurant_name,
        "restaurant_id": monitor.restaurant_id,
        "party_size": monitor.party_size,
        "target_time": monitor.target_time,
        "days_of_week": monitor.days_of_week,
        "weeks_ahead": monitor.weeks_ahead,
        "is_active": monitor.is_active,
    }


@app.delete("/api/monitors/{monitor_id}")
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(monitor)
    db.commit()
    return {"ok": True}


# ─── Notifications ───


@app.get("/api/notifications")
def list_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()
    return {
        "notifications": [
            {
                "id": n.id,
                "monitor_id": n.monitor_id,
                "restaurant_name": n.restaurant_name,
                "slot_datetime": n.slot_datetime,
                "party_size": n.party_size,
                "status": n.status,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ]
    }


# ─── Settings ───


@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Settings).all()
    result = {}
    for s in settings:
        # Mask sensitive values
        if s.key in ("twilio_auth_token", "opentable_bearer_token"):
            result[s.key] = "***" + s.value[-4:] if len(s.value) > 4 else "****"
        else:
            result[s.key] = s.value
    return {"settings": result}


@app.put("/api/settings")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            existing = db.query(Settings).filter(Settings.key == key).first()
            if existing:
                existing.value = value
            else:
                db.add(Settings(key=key, value=value))
    db.commit()
    return {"ok": True}


# ─── Twilio Webhook ───


@app.post("/api/twilio/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle incoming SMS replies from Twilio.

    Expected format: YES <notification_id> or NO <notification_id>
    """
    form_data = await request.form()
    body = str(form_data.get("Body", "")).strip().upper()
    from_number = str(form_data.get("From", ""))

    logger.info(f"Received SMS from {from_number}: {body}")

    parts = body.split()
    if len(parts) < 2:
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Message>Reply YES [id] to book or NO [id] to skip.</Message></Response>",
            media_type="application/xml",
        )

    action = parts[0]
    try:
        notification_id = int(parts[1])
    except ValueError:
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Message>Invalid notification ID. Reply YES [id] or NO [id].</Message></Response>",
            media_type="application/xml",
        )

    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Message>Notification not found.</Message></Response>",
            media_type="application/xml",
        )

    if notification.status != "pending":
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?>'
            f"<Response><Message>This notification is already {notification.status}.</Message></Response>",
            media_type="application/xml",
        )

    if action == "NO":
        notification.status = "declined"
        db.commit()
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Message>Got it, skipping this reservation.</Message></Response>",
            media_type="application/xml",
        )

    if action == "YES":
        notification.status = "confirmed"
        db.commit()

        # Attempt to book the reservation
        settings_map = {s.key: s.value for s in db.query(Settings).all()}
        bearer_token = settings_map.get("opentable_bearer_token", "")
        to_number = settings_map.get("twilio_to_number", "")

        lock_data = await lock_reservation(
            restaurant_id=notification.restaurant_id,
            party_size=notification.party_size,
            date_time=notification.slot_datetime,
            slot_hash=notification.slot_hash,
            bearer_token=bearer_token if bearer_token else None,
        )

        if not lock_data:
            notification.status = "failed"
            db.commit()
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?>'
                "<Response><Message>Sorry, couldn't lock that slot. It may have been taken.</Message></Response>",
                media_type="application/xml",
            )

        lock_id = lock_data.get("id", "")
        reservation_data = await complete_reservation(
            restaurant_id=notification.restaurant_id,
            party_size=notification.party_size,
            date_time=notification.slot_datetime,
            slot_hash=notification.slot_hash,
            slot_token=notification.slot_token or "",
            lock_id=str(lock_id),
            phone_number=to_number,
            bearer_token=bearer_token if bearer_token else None,
            gpid=settings_map.get("opentable_gpid"),
            diner_id=settings_map.get("opentable_diner_id"),
        )

        if reservation_data:
            notification.status = "booked"
            db.commit()
            conf_num = reservation_data.get("confirmationNumber", "N/A")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?>'
                f"<Response><Message>Booked! Confirmation: {conf_num} at {notification.restaurant_name} "
                f"on {notification.slot_datetime}.</Message></Response>",
                media_type="application/xml",
            )
        else:
            notification.status = "failed"
            db.commit()
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?>'
                "<Response><Message>Sorry, booking failed. The slot may no longer be available.</Message></Response>",
                media_type="application/xml",
            )

    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?>'
        "<Response><Message>Reply YES [id] to book or NO [id] to skip.</Message></Response>",
        media_type="application/xml",
    )


# ─── Manual Actions ───


@app.post("/api/poll")
def manual_poll():
    """Manually trigger a reservation poll."""
    trigger_poll_now()
    return {"ok": True, "message": "Poll triggered"}


@app.post("/api/check-availability")
async def check_single_availability(
    restaurant_id: str,
    date: str,
    time: str = "19:00",
    party_size: int = 2,
    db: Session = Depends(get_db),
):
    """Check availability for a single restaurant/date for testing."""
    settings_map = {s.key: s.value for s in db.query(Settings).all()}
    bearer_token = settings_map.get("opentable_bearer_token", "")

    slots = await check_availability(
        restaurant_id=restaurant_id,
        date_str=date,
        time_str=time,
        party_size=party_size,
        bearer_token=bearer_token if bearer_token else None,
    )
    return {"slots": slots}
