import json
from fastapi import APIRouter, Depends, Query
from app.auth import require_auth
from app.database import get_db
from app.models import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    _: str = Depends(require_auth),
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [
            NotificationResponse(
                id=row["id"],
                monitor_id=row["monitor_id"],
                restaurant_name=row["restaurant_name"],
                slot_datetime=row["slot_datetime"],
                party_size=row["party_size"],
                slot_hash=row["slot_hash"],
                slot_token=row["slot_token"],
                status=row["status"],
                sms_sid=row["sms_sid"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, _: str = Depends(require_auth)):
    async with get_db() as db:
        await db.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
        await db.commit()
        return {"status": "deleted"}
