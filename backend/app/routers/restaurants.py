from fastapi import APIRouter, Query
from app.opentable import search_restaurants
from app.models import RestaurantSearchResult

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.get("/search", response_model=list[RestaurantSearchResult])
async def search(query: str = Query(..., min_length=2)):
    results = await search_restaurants(query)
    return [RestaurantSearchResult(**r) for r in results]
