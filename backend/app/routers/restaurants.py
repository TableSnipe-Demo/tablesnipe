from fastapi import APIRouter, HTTPException, Cookie, Header, Query
from typing import Optional
from app.routers.auth import verify_token
from app.services.opentable import search_restaurants

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.get("/search")
async def search(
    q: str = Query(..., description="Search query"),
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    if not verify_token(session_token, authorization):
        raise HTTPException(status_code=401, detail="Not authenticated")
    results = await search_restaurants(q)
    return results
