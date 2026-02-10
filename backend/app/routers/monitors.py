from fastapi import APIRouter, HTTPException, Cookie, Header
from pydantic import BaseModel
from typing import Optional
import json
from app.database import get_db
from app.routers.auth import verify_token

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


class MonitorCreate(BaseModel):
    restaurant_name: str
    opentable_id: str
    days_of_week: list[int]
    time_start: str = "17:00"
    time_end: str = "21:00"
    party_size: int = 2
    weeks_ahead: int = 4


class MonitorUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    days_of_week: Optional[list[int]] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    party_size: Optional[int] = None
    weeks_ahead: Optional[int] = None
    active: Optional[bool] = None


@router.get("")
async def list_monitors(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    rows = conn.execute("SELECT * FROM monitors ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for row in rows:
        m = dict(row)
        m["days_of_week"] = json.loads(m["days_of_week"])
        m["active"] = bool(m["active"])
        result.append(m)
    return result


@router.post("")
async def create_monitor(req: MonitorCreate, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO monitors (restaurant_name, opentable_id, days_of_week, time_start, time_end, party_size, weeks_ahead) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            req.restaurant_name,
            req.opentable_id,
            json.dumps(req.days_of_week),
            req.time_start,
            req.time_end,
            req.party_size,
            req.weeks_ahead,
        ),
    )
    conn.commit()
    monitor_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
    conn.close()
    m = dict(row)
    m["days_of_week"] = json.loads(m["days_of_week"])
    m["active"] = bool(m["active"])
    return m


@router.put("/{monitor_id}")
async def update_monitor(monitor_id: int, req: MonitorUpdate, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    existing = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Monitor not found")

    updates = []
    params = []
    if req.restaurant_name is not None:
        updates.append("restaurant_name = ?")
        params.append(req.restaurant_name)
    if req.days_of_week is not None:
        updates.append("days_of_week = ?")
        params.append(json.dumps(req.days_of_week))
    if req.time_start is not None:
        updates.append("time_start = ?")
        params.append(req.time_start)
    if req.time_end is not None:
        updates.append("time_end = ?")
        params.append(req.time_end)
    if req.party_size is not None:
        updates.append("party_size = ?")
        params.append(req.party_size)
    if req.weeks_ahead is not None:
        updates.append("weeks_ahead = ?")
        params.append(req.weeks_ahead)
    if req.active is not None:
        updates.append("active = ?")
        params.append(1 if req.active else 0)

    if updates:
        params.append(monitor_id)
        conn.execute(f"UPDATE monitors SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    row = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
    conn.close()
    m = dict(row)
    m["days_of_week"] = json.loads(m["days_of_week"])
    m["active"] = bool(m["active"])
    return m


@router.delete("/{monitor_id}")
async def delete_monitor(monitor_id: int, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    conn = get_db()
    conn.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
    conn.execute("DELETE FROM alerts WHERE monitor_id = ?", (monitor_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}
