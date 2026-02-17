from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Monitor
from app.schemas import MonitorCreate, MonitorUpdate, MonitorResponse

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


@router.get("", response_model=list[MonitorResponse])
async def list_monitors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).order_by(Monitor.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=MonitorResponse, status_code=201)
async def create_monitor(data: MonitorCreate, db: AsyncSession = Depends(get_db)):
    monitor = Monitor(**data.model_dump())
    db.add(monitor)
    await db.commit()
    await db.refresh(monitor)
    return monitor


@router.get("/{monitor_id}", response_model=MonitorResponse)
async def get_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return monitor


@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: int, data: MonitorUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(monitor, key, value)

    await db.commit()
    await db.refresh(monitor)
    return monitor


@router.delete("/{monitor_id}", status_code=204)
async def delete_monitor(monitor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Monitor).where(Monitor.id == monitor_id))
    monitor = result.scalar_one_or_none()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    await db.delete(monitor)
    await db.commit()
