from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models import MonitorCreate, MonitorUpdate, MonitorResponse

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


@router.get("", response_model=list[MonitorResponse])
async def list_monitors():
    with get_db() as db:
        rows = db.execute("SELECT * FROM monitors ORDER BY created_at DESC").fetchall()
    return [
        MonitorResponse(
            id=r["id"],
            restaurant_name=r["restaurant_name"],
            restaurant_id=r["restaurant_id"],
            day_of_week=r["day_of_week"],
            time_of_day=r["time_of_day"],
            party_size=r["party_size"],
            weeks_ahead=r["weeks_ahead"],
            active=bool(r["active"]),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("", response_model=MonitorResponse)
async def create_monitor(monitor: MonitorCreate):
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO monitors (restaurant_name, restaurant_id, day_of_week, time_of_day, party_size, weeks_ahead) VALUES (?, ?, ?, ?, ?, ?)",
            (
                monitor.restaurant_name,
                monitor.restaurant_id,
                monitor.day_of_week,
                monitor.time_of_day,
                monitor.party_size,
                monitor.weeks_ahead,
            ),
        )
        row = db.execute(
            "SELECT * FROM monitors WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return MonitorResponse(
        id=row["id"],
        restaurant_name=row["restaurant_name"],
        restaurant_id=row["restaurant_id"],
        day_of_week=row["day_of_week"],
        time_of_day=row["time_of_day"],
        party_size=row["party_size"],
        weeks_ahead=row["weeks_ahead"],
        active=bool(row["active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(monitor_id: int, monitor: MonitorUpdate):
    with get_db() as db:
        existing = db.execute(
            "SELECT * FROM monitors WHERE id = ?", (monitor_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Monitor not found")

        updates = {}
        if monitor.restaurant_name is not None:
            updates["restaurant_name"] = monitor.restaurant_name
        if monitor.restaurant_id is not None:
            updates["restaurant_id"] = monitor.restaurant_id
        if monitor.day_of_week is not None:
            updates["day_of_week"] = monitor.day_of_week
        if monitor.time_of_day is not None:
            updates["time_of_day"] = monitor.time_of_day
        if monitor.party_size is not None:
            updates["party_size"] = monitor.party_size
        if monitor.weeks_ahead is not None:
            updates["weeks_ahead"] = monitor.weeks_ahead
        if monitor.active is not None:
            updates["active"] = 1 if monitor.active else 0

        if updates:
            updates["updated_at"] = "datetime('now')"
            set_clause = ", ".join(
                f"{k} = datetime('now')" if k == "updated_at" else f"{k} = ?"
                for k in updates
            )
            values = [v for k, v in updates.items() if k != "updated_at"]
            values.append(monitor_id)
            db.execute(
                f"UPDATE monitors SET {set_clause} WHERE id = ?",
                values,
            )

        row = db.execute(
            "SELECT * FROM monitors WHERE id = ?", (monitor_id,)
        ).fetchone()

    return MonitorResponse(
        id=row["id"],
        restaurant_name=row["restaurant_name"],
        restaurant_id=row["restaurant_id"],
        day_of_week=row["day_of_week"],
        time_of_day=row["time_of_day"],
        party_size=row["party_size"],
        weeks_ahead=row["weeks_ahead"],
        active=bool(row["active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.delete("/{monitor_id}")
async def delete_monitor(monitor_id: int):
    with get_db() as db:
        existing = db.execute(
            "SELECT * FROM monitors WHERE id = ?", (monitor_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Monitor not found")
        db.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
    return {"status": "deleted"}
