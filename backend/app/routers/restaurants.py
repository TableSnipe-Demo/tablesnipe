from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Settings
from app.opentable import search_restaurants
from app.schemas import RestaurantSearchResult

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.get("/search", response_model=list[RestaurantSearchResult])
async def search(
    query: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings or not settings.opentable_auth_token:
        return []

    results = await search_restaurants(query, settings.opentable_auth_token)
    return results
