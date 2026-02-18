import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Form
from pydantic import BaseModel
from app.database import get_db, row_to_dict
from app.opentable import search_restaurants, check_availability_range
from app.twilio_service import send_sms, format_availability_message

router = APIRouter(prefix="/api")


# ─── Pydantic Models ───


class MonitorCreate(BaseModel):
    restaurant_id: str
    restaurant_name: str
    party_size: int = 2
    days_of_week: list[int] = []  # 0=Mon .. 6=Sun
    time_start: str = "18:00"
    time_end: str = "21:00"
    weeks_ahead: int = 4
    active: bool = True


class MonitorUpdate(BaseModel):
    restaurant_id: str | None = None
    restaurant_name: str | None = None
    party_size: int | None = None
    days_of_week: list[int] | None = None
    time_start: str | None = None
    time_end: str | None = None
    weeks_ahead: int | None = None
    active: bool | None = None


class SettingsUpdate(BaseModel):
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None
    user_phone_number: str | None = None
    webhook_base_url: str | None = None


# ─── Restaurant Search ───


@router.get("/restaurants/search")
async def restaurant_search(q: str, lat: float = 40.7128, lng: float = -73.9060):
    if not q or len(q) < 2:
        return {"restaurants": []}
    results = await search_restaurants(q, lat, lng)
    return {"restaurants": results}


# ─── Monitors CRUD ───


@router.get("/monitors")
async def list_monitors():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM monitors ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return {"monitors": [row_to_dict(r) for r in rows]}
    finally:
        await db.close()


@router.post("/monitors")
async def create_monitor(monitor: MonitorCreate):
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO monitors
               (restaurant_id, restaurant_name, party_size, days_of_week, time_start, time_end, weeks_ahead, active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                monitor.restaurant_id,
                monitor.restaurant_name,
                monitor.party_size,
                json.dumps(monitor.days_of_week),
                monitor.time_start,
                monitor.time_end,
                monitor.weeks_ahead,
                1 if monitor.active else 0,
            ),
        )
        await db.commit()
        new_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM monitors WHERE id = ?", (new_id,))
        row = await cursor.fetchone()
        return {"monitor": row_to_dict(row)}
    finally:
        await db.close()


@router.put("/monitors/{monitor_id}")
async def update_monitor(monitor_id: int, updates: MonitorUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Monitor not found")

        fields = []
        values = []
        update_dict = updates.model_dump(exclude_none=True)
        for key, value in update_dict.items():
            if key == "days_of_week":
                fields.append(f"{key} = ?")
                values.append(json.dumps(value))
            elif key == "active":
                fields.append(f"{key} = ?")
                values.append(1 if value else 0)
            else:
                fields.append(f"{key} = ?")
                values.append(value)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        fields.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(monitor_id)

        await db.execute(
            f"UPDATE monitors SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,))
        row = await cursor.fetchone()
        return {"monitor": row_to_dict(row)}
    finally:
        await db.close()


@router.delete("/monitors/{monitor_id}")
async def delete_monitor(monitor_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM monitors WHERE id = ?", (monitor_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Monitor not found")
        await db.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
        await db.commit()
        return {"deleted": True}
    finally:
        await db.close()


# ─── Settings ───


@router.get("/settings")
async def get_settings():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM settings WHERE id = 1")
        row = await cursor.fetchone()
        settings = dict(row) if row else {}
        # Mask auth token for security
        if settings.get("twilio_auth_token"):
            token = settings["twilio_auth_token"]
            settings["twilio_auth_token_masked"] = token[:4] + "****" + token[-4:] if len(token) > 8 else "****"
        else:
            settings["twilio_auth_token_masked"] = ""
        return {"settings": settings}
    finally:
        await db.close()


@router.put("/settings")
async def update_settings(updates: SettingsUpdate):
    db = await get_db()
    try:
        fields = []
        values = []
        update_dict = updates.model_dump(exclude_none=True)
        for key, value in update_dict.items():
            fields.append(f"{key} = ?")
            values.append(value)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        fields.append("updated_at = ?")
        values.append(datetime.now().isoformat())

        await db.execute(
            f"UPDATE settings SET {', '.join(fields)} WHERE id = 1",
            values,
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM settings WHERE id = 1")
        row = await cursor.fetchone()
        settings = dict(row) if row else {}
        if settings.get("twilio_auth_token"):
            token = settings["twilio_auth_token"]
            settings["twilio_auth_token_masked"] = token[:4] + "****" + token[-4:] if len(token) > 8 else "****"
        else:
            settings["twilio_auth_token_masked"] = ""
        return {"settings": settings}
    finally:
        await db.close()


# ─── Notifications ───


@router.get("/notifications")
async def list_notifications(limit: int = 50):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return {"notifications": [dict(r) for r in rows]}
    finally:
        await db.close()


# ─── Twilio Webhook (incoming SMS) ───


@router.post("/twilio/webhook")
async def twilio_webhook(
    Body: str = Form(""),
    From: str = Form(""),
    MessageSid: str = Form(""),
):
    """Handle incoming SMS replies from Twilio."""
    body = Body.strip().upper()
    from_number = From.strip()

    print(f"Received SMS from {from_number}: {Body}")

    db = await get_db()
    try:
        # Get settings to verify the sender
        cursor = await db.execute("SELECT * FROM settings WHERE id = 1")
        settings_row = await cursor.fetchone()
        settings = dict(settings_row) if settings_row else {}

        # Find the most recent pending notification
        # User can also reply with "YES #123" to target a specific notification
        notification_id = None
        if "#" in body:
            try:
                ref_part = body.split("#")[1].strip()
                notification_id = int(ref_part.split()[0])
            except (ValueError, IndexError):
                pass

        if notification_id:
            cursor = await db.execute(
                "SELECT * FROM notifications WHERE id = ? AND status = 'pending'",
                (notification_id,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM notifications WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1"
            )

        notification = await cursor.fetchone()

        if not notification:
            # Send reply that there's nothing pending
            twilio_sid = settings.get("twilio_account_sid", "")
            twilio_token = settings.get("twilio_auth_token", "")
            twilio_from = settings.get("twilio_phone_number", "")
            if twilio_sid and twilio_token and twilio_from:
                send_sms(twilio_sid, twilio_token, twilio_from, from_number,
                         "No pending reservations to respond to.")
            return {"status": "no_pending"}

        notif = dict(notification)

        if body.startswith("YES"):
            # Mark as confirmed
            await db.execute(
                "UPDATE notifications SET status = 'confirmed', responded_at = ? WHERE id = ?",
                (datetime.now().isoformat(), notif["id"]),
            )
            await db.commit()

            # Send confirmation SMS
            twilio_sid = settings.get("twilio_account_sid", "")
            twilio_token = settings.get("twilio_auth_token", "")
            twilio_from = settings.get("twilio_phone_number", "")
            if twilio_sid and twilio_token and twilio_from:
                send_sms(
                    twilio_sid, twilio_token, twilio_from, from_number,
                    f"Reservation confirmed! {notif['restaurant_name']} at {notif['slot_datetime']}. "
                    f"Please complete your booking on OpenTable."
                )

            return {"status": "confirmed", "notification_id": notif["id"]}

        elif body.startswith("NO"):
            # Mark as denied
            await db.execute(
                "UPDATE notifications SET status = 'denied', responded_at = ? WHERE id = ?",
                (datetime.now().isoformat(), notif["id"]),
            )
            await db.commit()

            twilio_sid = settings.get("twilio_account_sid", "")
            twilio_token = settings.get("twilio_auth_token", "")
            twilio_from = settings.get("twilio_phone_number", "")
            if twilio_sid and twilio_token and twilio_from:
                send_sms(
                    twilio_sid, twilio_token, twilio_from, from_number,
                    f"Reservation skipped for {notif['restaurant_name']}. Will keep monitoring!"
                )

            return {"status": "denied", "notification_id": notif["id"]}

        else:
            # Unknown reply
            twilio_sid = settings.get("twilio_account_sid", "")
            twilio_token = settings.get("twilio_auth_token", "")
            twilio_from = settings.get("twilio_phone_number", "")
            if twilio_sid and twilio_token and twilio_from:
                send_sms(
                    twilio_sid, twilio_token, twilio_from, from_number,
                    "Reply YES to book or NO to skip the reservation."
                )
            return {"status": "unknown_reply"}

    finally:
        await db.close()


# ─── Manual Poll Trigger ───


@router.post("/poll/trigger")
async def trigger_poll():
    """Manually trigger a poll cycle."""
    from app.scheduler import poll_all_monitors
    import asyncio
    asyncio.create_task(poll_all_monitors())
    return {"status": "poll_triggered"}


# ─── Poll Log ───


@router.get("/poll-log")
async def get_poll_log(limit: int = 50):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM poll_log ORDER BY polled_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return {"logs": [dict(r) for r in rows]}
    finally:
        await db.close()
