from fastapi import APIRouter

from app.schemas import RestaurantSearchResult
from app.services.opentable import search_restaurants

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.get("/search", response_model=list[RestaurantSearchResult])
async def search(query: str):
    """Search OpenTable for restaurants by name."""
    if not query or len(query) < 2:
        return []
    return await search_restaurants(query)
