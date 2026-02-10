from fastapi import APIRouter
from app.database import get_db
from app.models import BookingResponse

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[BookingResponse])
async def list_bookings():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM bookings ORDER BY created_at DESC"
        ).fetchall()
    return [
        BookingResponse(
            id=r["id"],
            monitor_id=r["monitor_id"],
            restaurant_name=r["restaurant_name"],
            restaurant_id=r["restaurant_id"],
            date=r["date"],
            time=r["time"],
            party_size=r["party_size"],
            status=r["status"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]
