from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Monitor, FoundSlot
from app.schemas import MonitorCreate, MonitorUpdate, MonitorResponse, FoundSlotResponse

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


@router.get("/", response_model=list[MonitorResponse])
def list_monitors(db: Session = Depends(get_db)):
    return db.query(Monitor).order_by(Monitor.created_at.desc()).all()


@router.post("/", response_model=MonitorResponse, status_code=201)
def create_monitor(monitor: MonitorCreate, db: Session = Depends(get_db)):
    db_monitor = Monitor(
        restaurant_id=monitor.restaurant_id,
        restaurant_name=monitor.restaurant_name,
        restaurant_image_url=monitor.restaurant_image_url,
        day_of_week=monitor.day_of_week,
        time_start=monitor.time_start,
        time_end=monitor.time_end,
        party_size=monitor.party_size,
        weeks_ahead=monitor.weeks_ahead,
    )
    db.add(db_monitor)
    db.commit()
    db.refresh(db_monitor)
    return db_monitor


@router.get("/{monitor_id}", response_model=MonitorResponse)
def get_monitor(monitor_id: int, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return monitor


@router.put("/{monitor_id}", response_model=MonitorResponse)
def update_monitor(monitor_id: int, update: MonitorUpdate, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(monitor, key, value)

    db.commit()
    db.refresh(monitor)
    return monitor


@router.delete("/{monitor_id}", status_code=204)
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(monitor)
    db.commit()


@router.get("/{monitor_id}/slots", response_model=list[FoundSlotResponse])
def get_monitor_slots(monitor_id: int, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return (
        db.query(FoundSlot)
        .filter(FoundSlot.monitor_id == monitor_id)
        .order_by(FoundSlot.created_at.desc())
        .all()
    )
