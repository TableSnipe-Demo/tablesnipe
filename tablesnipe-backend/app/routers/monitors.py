import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.auth import require_auth
from app.database import get_db
from app.models import MonitorCreate, MonitorUpdate, MonitorResponse

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


@router.get("", response_model=list[MonitorResponse])
async def list_monitors(_: str = Depends(require_auth)):
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM monitors ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [
            MonitorResponse(
                id=row["id"],
                restaurant_name=row["restaurant_name"],
                restaurant_id=row["restaurant_id"],
                party_size=row["party_size"],
                days_of_week=json.loads(row["days_of_week"]),
                time_start=row["time_start"],
                time_end=row["time_end"],
                weeks_ahead=row["weeks_ahead"],
                enabled=bool(row["enabled"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]


@router.post("", response_model=MonitorResponse, status_code=201)
async def create_monitor(monitor: MonitorCreate, _: str = Depends(require_auth)):
    now = datetime.now().isoformat()
    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO monitors
            (restaurant_name, restaurant_id, party_size, days_of_week,
             time_start, time_end, weeks_ahead, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                monitor.restaurant_name,
                monitor.restaurant_id,
                monitor.party_size,
                json.dumps(monitor.days_of_week),
                monitor.time_start,
                monitor.time_end,
                monitor.weeks_ahead,
                1 if monitor.enabled else 0,
                now,
                now,
            ),
        )
        await db.commit()
        monitor_id = cursor.lastrowid

        return MonitorResponse(
            id=monitor_id,
            restaurant_name=monitor.restaurant_name,
            restaurant_id=monitor.restaurant_id,
            party_size=monitor.party_size,
            days_of_week=monitor.days_of_week,
            time_start=monitor.time_start,
            time_end=monitor.time_end,
            weeks_ahead=monitor.weeks_ahead,
            enabled=monitor.enabled,
            created_at=now,
            updated_at=now,
        )


@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: int, update: MonitorUpdate, _: str = Depends(require_auth)
):
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,))
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Monitor not found")

        existing_dict = dict(existing)
        now = datetime.now().isoformat()

        # Build update fields
        new_name = update.restaurant_name if update.restaurant_name is not None else existing_dict["restaurant_name"]
        new_rid = update.restaurant_id if update.restaurant_id is not None else existing_dict["restaurant_id"]
        new_party = update.party_size if update.party_size is not None else existing_dict["party_size"]
        new_days = json.dumps(update.days_of_week) if update.days_of_week is not None else existing_dict["days_of_week"]
        new_start = update.time_start if update.time_start is not None else existing_dict["time_start"]
        new_end = update.time_end if update.time_end is not None else existing_dict["time_end"]
        new_weeks = update.weeks_ahead if update.weeks_ahead is not None else existing_dict["weeks_ahead"]
        new_enabled = (1 if update.enabled else 0) if update.enabled is not None else existing_dict["enabled"]

        await db.execute(
            """UPDATE monitors SET
            restaurant_name=?, restaurant_id=?, party_size=?, days_of_week=?,
            time_start=?, time_end=?, weeks_ahead=?, enabled=?, updated_at=?
            WHERE id=?""",
            (new_name, new_rid, new_party, new_days, new_start, new_end,
             new_weeks, new_enabled, now, monitor_id),
        )
        await db.commit()

        days_list = json.loads(new_days) if isinstance(new_days, str) else new_days

        return MonitorResponse(
            id=monitor_id,
            restaurant_name=new_name,
            restaurant_id=new_rid,
            party_size=new_party,
            days_of_week=days_list,
            time_start=new_start,
            time_end=new_end,
            weeks_ahead=new_weeks,
            enabled=bool(new_enabled),
            created_at=existing_dict["created_at"],
            updated_at=now,
        )


@router.delete("/{monitor_id}")
async def delete_monitor(monitor_id: int, _: str = Depends(require_auth)):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM monitors WHERE id = ?", (monitor_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Monitor not found")

        await db.execute("DELETE FROM notifications WHERE monitor_id = ?", (monitor_id,))
        await db.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
        await db.commit()
        return {"status": "deleted"}
