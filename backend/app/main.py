from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
import json

from app.database import (
    init_db,
    create_monitor,
    get_monitors,
    get_monitor,
    update_monitor,
    delete_monitor,
    get_settings,
    update_settings,
    get_found_slots,
    get_found_slots_for_monitor,
    get_pending_slot_for_user,
    update_slot_status,
    mark_slot_notified,
    check_slot_already_found,
    create_found_slot,
)
from app.opentable import search_restaurants, check_availability, get_dates_for_monitor, filter_slots_by_time
from app.sms import get_twilio_client, send_sms, build_slot_notification
from app.scheduler import start_scheduler, stop_scheduler, check_all_monitors


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# --- Pydantic Models ---

class MonitorCreate(BaseModel):
    restaurant_id: str
    restaurant_name: str
    party_size: int = 2
    days_of_week: list[int] = []
    time_start: str = "18:00"
    time_end: str = "21:00"
    weeks_ahead: int = 4
    active: bool = True


class MonitorUpdate(BaseModel):
    restaurant_id: Optional[str] = None
    restaurant_name: Optional[str] = None
    party_size: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    weeks_ahead: Optional[int] = None
    active: Optional[bool] = None


class SettingsUpdate(BaseModel):
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    user_phone_number: Optional[str] = None
    opentable_bearer_token: Optional[str] = None


# --- Health ---

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# --- Monitors ---

@app.get("/api/monitors")
async def list_monitors():
    monitors = get_monitors()
    for m in monitors:
        m["days_of_week"] = json.loads(m.get("days_of_week", "[]"))
        m["active"] = bool(m.get("active"))
    return monitors


@app.post("/api/monitors")
async def add_monitor(data: MonitorCreate):
    monitor = create_monitor(data.model_dump())
    monitor["days_of_week"] = json.loads(monitor.get("days_of_week", "[]"))
    monitor["active"] = bool(monitor.get("active"))
    return monitor


@app.get("/api/monitors/{monitor_id}")
async def get_monitor_detail(monitor_id: int):
    monitor = get_monitor(monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    monitor["days_of_week"] = json.loads(monitor.get("days_of_week", "[]"))
    monitor["active"] = bool(monitor.get("active"))
    return monitor


@app.put("/api/monitors/{monitor_id}")
async def edit_monitor(monitor_id: int, data: MonitorUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    monitor = update_monitor(monitor_id, update_data)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    monitor["days_of_week"] = json.loads(monitor.get("days_of_week", "[]"))
    monitor["active"] = bool(monitor.get("active"))
    return monitor


@app.delete("/api/monitors/{monitor_id}")
async def remove_monitor(monitor_id: int):
    success = delete_monitor(monitor_id)
    if not success:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return {"deleted": True}


# --- Settings ---

@app.get("/api/settings")
async def get_app_settings():
    settings = get_settings()
    # Mask sensitive fields
    if settings.get("twilio_auth_token"):
        token = settings["twilio_auth_token"]
        settings["twilio_auth_token_masked"] = f"{'*' * (len(token) - 4)}{token[-4:]}" if len(token) > 4 else "****"
    if settings.get("opentable_bearer_token"):
        bt = settings["opentable_bearer_token"]
        settings["opentable_bearer_token_masked"] = f"{bt[:10]}...{bt[-4:]}" if len(bt) > 14 else "****"
    return settings


@app.post("/api/settings")
async def save_settings(data: SettingsUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    settings = update_settings(update_data)
    return settings


# --- Restaurant Search ---

@app.get("/api/restaurants/search")
async def search_opentable_restaurants(query: str):
    settings = get_settings()
    bearer_token = settings.get("opentable_bearer_token", "")
    results = await search_restaurants(query, bearer_token)
    return results


# --- Activity / Found Slots ---

@app.get("/api/activity")
async def get_activity(limit: int = 50):
    slots = get_found_slots(limit)
    return slots


@app.get("/api/monitors/{monitor_id}/slots")
async def get_monitor_slots(monitor_id: int):
    slots = get_found_slots_for_monitor(monitor_id)
    return slots


# --- Manual Check ---

@app.post("/api/monitors/{monitor_id}/check")
async def manual_check(monitor_id: int):
    """Manually trigger an availability check for a single monitor."""
    monitor = get_monitor(monitor_id)
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    settings = get_settings()
    bearer_token = settings.get("opentable_bearer_token", "")

    days_of_week = json.loads(monitor.get("days_of_week", "[]"))
    if not days_of_week:
        return {"message": "No days of week configured", "slots_found": 0}

    dates = get_dates_for_monitor(days_of_week, monitor.get("weeks_ahead", 4))
    time_start = monitor.get("time_start", "18:00")
    time_end = monitor.get("time_end", "21:00")

    new_slots = []
    for date_str in dates:
        try:
            slots = await check_availability(
                restaurant_id=monitor["restaurant_id"],
                date_str=date_str,
                time_str=time_start,
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
                new_slots.append(found)

                # Send SMS if configured
                twilio_sid = settings.get("twilio_account_sid", "")
                twilio_token_val = settings.get("twilio_auth_token", "")
                twilio_phone = settings.get("twilio_phone_number", "")
                user_phone = settings.get("user_phone_number", "")

                if twilio_sid and twilio_token_val and twilio_phone and user_phone:
                    client = get_twilio_client(twilio_sid, twilio_token_val)
                    if client:
                        msg = build_slot_notification(
                            restaurant_name=monitor["restaurant_name"],
                            date=slot_date,
                            time=slot_time,
                            party_size=monitor["party_size"],
                            slot_id=found["id"],
                        )
                        sent = send_sms(client, twilio_phone, user_phone, msg)
                        if sent:
                            mark_slot_notified(found["id"])
        except Exception as e:
            print(f"Manual check error for {date_str}: {e}")

    return {"message": "Check complete", "slots_found": len(new_slots), "slots": new_slots}


# --- Check All (trigger full poll) ---

@app.post("/api/check-all")
async def trigger_check_all():
    """Manually trigger availability check for all monitors."""
    await check_all_monitors()
    return {"message": "Check complete"}


# --- Twilio Webhook ---

@app.post("/api/webhooks/twilio")
async def twilio_webhook(request: Request):
    """Handle incoming SMS from Twilio."""
    form_data = await request.form()
    body = form_data.get("Body", "").strip().upper()
    from_number = form_data.get("From", "")

    print(f"Received SMS from {from_number}: {body}")

    # Find the most recent notified slot
    pending_slot = get_pending_slot_for_user()

    if not pending_slot:
        twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>No pending reservations to respond to. Check your TableSnipe dashboard for details.</Message></Response>'
        return Response(content=twiml, media_type="application/xml")

    if body in ("YES", "Y", "BOOK", "CONFIRM"):
        update_slot_status(pending_slot["id"], "confirmed")
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Confirmed! Reservation at {pending_slot["restaurant_name"]} on {pending_slot["date"]} at {pending_slot["time"]} has been marked as confirmed. Visit OpenTable to complete your booking.</Message></Response>'
    elif body in ("NO", "N", "SKIP", "DENY"):
        update_slot_status(pending_slot["id"], "denied")
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Skipped. We\'ll keep looking for other availability at {pending_slot["restaurant_name"]}.</Message></Response>'
    else:
        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Reply YES to confirm the reservation at {pending_slot["restaurant_name"]} on {pending_slot["date"]} at {pending_slot["time"]}, or NO to skip.</Message></Response>'

    return Response(content=twiml, media_type="application/xml")
