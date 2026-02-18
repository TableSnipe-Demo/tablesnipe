import json
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.database import init_db, get_db
from app.scheduler import poll_availability
from app.sms import send_sms

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Get polling interval from settings
    with get_db() as conn:
        row = conn.execute("SELECT polling_interval_minutes FROM settings WHERE id = 1").fetchone()
        interval = dict(row)["polling_interval_minutes"] if row else 15

    scheduler.add_job(poll_availability, "interval", minutes=interval, id="poll_availability", replace_existing=True)
    scheduler.start()
    logger.info(f"Scheduler started with {interval} minute interval")
    yield
    scheduler.shutdown()


app = FastAPI(title="TableSnipe", lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# ---- Pydantic Models ----

class RestaurantCreate(BaseModel):
    opentable_id: str
    name: str
    cuisine: str = ""
    location: str = ""


class MonitorCreate(BaseModel):
    restaurant_id: int
    days_of_week: list[int] = []  # ISO weekday: 1=Mon, 7=Sun
    time_start: str = "18:00"
    time_end: str = "21:00"
    party_size: int = 2
    weeks_ahead: int = 4
    enabled: bool = True


class MonitorUpdate(BaseModel):
    days_of_week: list[int] | None = None
    time_start: str | None = None
    time_end: str | None = None
    party_size: int | None = None
    weeks_ahead: int | None = None
    enabled: bool | None = None


class SettingsUpdate(BaseModel):
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None
    user_phone_number: str | None = None
    opentable_bearer_token: str | None = None
    polling_interval_minutes: int | None = None


# ---- Health ----

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ---- Restaurants ----

@app.get("/api/restaurants")
async def list_restaurants():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM restaurants ORDER BY name").fetchall()
    return [dict(r) for r in rows]


@app.post("/api/restaurants")
async def create_restaurant(restaurant: RestaurantCreate):
    with get_db() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO restaurants (opentable_id, name, cuisine, location) VALUES (?, ?, ?, ?)",
                (restaurant.opentable_id, restaurant.name, restaurant.cuisine, restaurant.location),
            )
            return {"id": cursor.lastrowid, **restaurant.model_dump()}
        except Exception as e:
            if "UNIQUE" in str(e):
                raise HTTPException(400, "Restaurant with this OpenTable ID already exists")
            raise


@app.delete("/api/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM restaurants WHERE id = ?", (restaurant_id,))
    return {"ok": True}


# ---- Monitors ----

@app.get("/api/monitors")
async def list_monitors():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT m.*, r.name as restaurant_name, r.opentable_id
            FROM monitors m
            JOIN restaurants r ON m.restaurant_id = r.id
            ORDER BY m.created_at DESC
        """).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["days_of_week"] = json.loads(d["days_of_week"])
        d["enabled"] = bool(d["enabled"])
        results.append(d)
    return results


@app.post("/api/monitors")
async def create_monitor(monitor: MonitorCreate):
    with get_db() as conn:
        # Verify restaurant exists
        rest = conn.execute("SELECT id FROM restaurants WHERE id = ?", (monitor.restaurant_id,)).fetchone()
        if not rest:
            raise HTTPException(404, "Restaurant not found")
        cursor = conn.execute(
            """INSERT INTO monitors (restaurant_id, days_of_week, time_start, time_end, party_size, weeks_ahead, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                monitor.restaurant_id,
                json.dumps(monitor.days_of_week),
                monitor.time_start,
                monitor.time_end,
                monitor.party_size,
                monitor.weeks_ahead,
                1 if monitor.enabled else 0,
            ),
        )
        return {"id": cursor.lastrowid, **monitor.model_dump()}


@app.put("/api/monitors/{monitor_id}")
async def update_monitor(monitor_id: int, update: MonitorUpdate):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Monitor not found")

        fields = []
        values = []
        if update.days_of_week is not None:
            fields.append("days_of_week = ?")
            values.append(json.dumps(update.days_of_week))
        if update.time_start is not None:
            fields.append("time_start = ?")
            values.append(update.time_start)
        if update.time_end is not None:
            fields.append("time_end = ?")
            values.append(update.time_end)
        if update.party_size is not None:
            fields.append("party_size = ?")
            values.append(update.party_size)
        if update.weeks_ahead is not None:
            fields.append("weeks_ahead = ?")
            values.append(update.weeks_ahead)
        if update.enabled is not None:
            fields.append("enabled = ?")
            values.append(1 if update.enabled else 0)

        if fields:
            values.append(monitor_id)
            conn.execute(f"UPDATE monitors SET {', '.join(fields)} WHERE id = ?", values)

    return {"ok": True}


@app.delete("/api/monitors/{monitor_id}")
async def delete_monitor(monitor_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
    return {"ok": True}


@app.post("/api/monitors/{monitor_id}/toggle")
async def toggle_monitor(monitor_id: int):
    with get_db() as conn:
        existing = conn.execute("SELECT enabled FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Monitor not found")
        new_enabled = 0 if existing["enabled"] else 1
        conn.execute("UPDATE monitors SET enabled = ? WHERE id = ?", (new_enabled, monitor_id))
    return {"enabled": bool(new_enabled)}


# ---- Settings ----

@app.get("/api/settings")
async def get_settings():
    with get_db() as conn:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
    if not row:
        return {}
    d = dict(row)
    # Mask sensitive fields
    if d.get("twilio_auth_token"):
        d["twilio_auth_token"] = "***" + d["twilio_auth_token"][-4:]
    if d.get("opentable_bearer_token"):
        d["opentable_bearer_token"] = "***" + d["opentable_bearer_token"][-4:]
    return d


@app.put("/api/settings")
async def update_settings(update: SettingsUpdate):
    with get_db() as conn:
        fields = []
        values = []
        for field_name, value in update.model_dump(exclude_none=True).items():
            fields.append(f"{field_name} = ?")
            values.append(value)

        if fields:
            conn.execute(f"UPDATE settings SET {', '.join(fields)} WHERE id = 1", values)

        # Reschedule if interval changed
        if update.polling_interval_minutes is not None:
            try:
                scheduler.reschedule_job(
                    "poll_availability",
                    trigger="interval",
                    minutes=update.polling_interval_minutes,
                )
                logger.info(f"Rescheduled polling to {update.polling_interval_minutes} minutes")
            except Exception as e:
                logger.error(f"Failed to reschedule: {e}")

    return {"ok": True}


# ---- Notifications ----

@app.get("/api/notifications")
async def list_notifications():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT n.*, fs.date_time as slot_date_time, fs.party_size,
                   r.name as restaurant_name
            FROM notifications n
            JOIN found_slots fs ON n.slot_id = fs.id
            JOIN restaurants r ON fs.restaurant_id = r.id
            ORDER BY n.created_at DESC
            LIMIT 100
        """).fetchall()
    return [dict(r) for r in rows]


# ---- Twilio Inbound Webhook ----

@app.post("/api/twilio/webhook")
async def twilio_webhook(request: Request):
    """Handle inbound SMS from Twilio."""
    form_data = await request.form()
    body = form_data.get("Body", "").strip().upper()
    from_number = form_data.get("From", "")

    logger.info(f"Received SMS from {from_number}: {body}")

    # Parse response: "YES <slot_id>" or "NO <slot_id>"
    parts = body.split()
    if len(parts) < 2:
        return {"message": "Invalid format. Reply YES <id> or NO <id>"}

    action = parts[0]
    try:
        slot_id = int(parts[1])
    except ValueError:
        return {"message": "Invalid slot ID"}

    with get_db() as conn:
        slot = conn.execute("SELECT * FROM found_slots WHERE id = ?", (slot_id,)).fetchone()
        if not slot:
            return {"message": "Slot not found"}

        slot = dict(slot)

        if action == "YES":
            conn.execute(
                "UPDATE found_slots SET status = 'confirmed' WHERE id = ?",
                (slot_id,),
            )
            conn.execute(
                "UPDATE notifications SET status = 'confirmed', responded_at = datetime('now') WHERE slot_id = ?",
                (slot_id,),
            )
            logger.info(f"Slot {slot_id} confirmed by user")

            # Send confirmation SMS
            settings = dict(conn.execute("SELECT * FROM settings WHERE id = 1").fetchone())
            if settings.get("twilio_account_sid"):
                restaurant = conn.execute(
                    "SELECT name FROM restaurants WHERE id = ?",
                    (slot["restaurant_id"],),
                ).fetchone()
                restaurant_name = dict(restaurant)["name"] if restaurant else "Unknown"

                send_sms(
                    to_number=from_number,
                    from_number=settings["twilio_phone_number"],
                    body=f"Confirmed! Your reservation at {restaurant_name} on {slot['date_time']} for {slot['party_size']} is noted. Please complete booking on OpenTable.",
                    account_sid=settings["twilio_account_sid"],
                    auth_token=settings["twilio_auth_token"],
                )

        elif action == "NO":
            conn.execute(
                "UPDATE found_slots SET status = 'declined' WHERE id = ?",
                (slot_id,),
            )
            conn.execute(
                "UPDATE notifications SET status = 'declined', responded_at = datetime('now') WHERE slot_id = ?",
                (slot_id,),
            )
            logger.info(f"Slot {slot_id} declined by user")
        else:
            return {"message": "Unknown action. Reply YES <id> or NO <id>"}

    return {"message": "ok"}


# ---- Slots ----

@app.get("/api/slots")
async def list_slots():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT fs.*, r.name as restaurant_name
            FROM found_slots fs
            JOIN restaurants r ON fs.restaurant_id = r.id
            ORDER BY fs.created_at DESC
            LIMIT 100
        """).fetchall()
    return [dict(r) for r in rows]


# ---- Manual Check ----

@app.post("/api/check-now")
async def check_now():
    """Trigger an immediate availability check."""
    try:
        await poll_availability()
        return {"ok": True, "message": "Availability check completed"}
    except Exception as e:
        logger.error(f"Manual check failed: {e}")
        raise HTTPException(500, f"Check failed: {str(e)}")
