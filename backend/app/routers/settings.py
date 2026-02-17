from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        await db.flush()

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings
