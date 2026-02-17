from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Notification, AvailabilityLog
from app.schemas import NotificationResponse, AvailabilityLogResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = 50, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/logs", response_model=list[AvailabilityLogResponse])
async def list_availability_logs(
    limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AvailabilityLog)
        .order_by(AvailabilityLog.checked_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
