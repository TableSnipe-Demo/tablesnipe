import httpx
import logging
from typing import Optional
from datetime import date

from app.schemas import RestaurantSearchResult, AvailabilitySlot

logger = logging.getLogger(__name__)

OPENTABLE_BASE = "https://www.opentable.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.opentable.com/",
    "Origin": "https://www.opentable.com",
}


async def search_restaurants(
    query: str,
    location: Optional[str] = None,
) -> list[RestaurantSearchResult]:
    """Search OpenTable for restaurants by name/query."""
    url = f"{OPENTABLE_BASE}/dapi/fe/gql"

    gql_query = {
        "operationName": "Autocomplete",
        "variables": {
            "term": query,
            "latitude": None,
            "longitude": None,
        },
        "query": """
            query Autocomplete($term: String!, $latitude: Float, $longitude: Float) {
                autocomplete(term: $term, latitude: $latitude, longitude: $longitude) {
                    restaurants {
                        rid
                        name
                        neighborhood
                        locality
                        primaryCuisine { name }
                        priceBand
                        overallRating { ratingValue }
                        profilePhoto { url }
                        urls { profileUrl }
                    }
                }
            }
        """,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(url, json=gql_query, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()

            restaurants_data = (
                data.get("data", {})
                .get("autocomplete", {})
                .get("restaurants", [])
            )

            results: list[RestaurantSearchResult] = []
            for r in restaurants_data:
                cuisine_obj = r.get("primaryCuisine")
                cuisine_name = cuisine_obj.get("name", "") if cuisine_obj else ""

                rating_obj = r.get("overallRating")
                rating_val = rating_obj.get("ratingValue") if rating_obj else None

                photo_obj = r.get("profilePhoto")
                image_url = photo_obj.get("url") if photo_obj else None

                urls_obj = r.get("urls")
                profile_url = urls_obj.get("profileUrl") if urls_obj else None

                results.append(
                    RestaurantSearchResult(
                        id=str(r.get("rid", "")),
                        name=r.get("name", ""),
                        address=r.get("neighborhood", ""),
                        city=r.get("locality", ""),
                        cuisine=cuisine_name,
                        price_range=str(r.get("priceBand", "")),
                        rating=float(rating_val) if rating_val else None,
                        image_url=image_url,
                        profile_url=f"{OPENTABLE_BASE}{profile_url}" if profile_url else None,
                    )
                )
            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenTable search HTTP error: {e.response.status_code}")
            return []
        except Exception as e:
            logger.error(f"OpenTable search error: {e}")
            return []


async def get_availability(
    restaurant_id: str,
    target_date: date,
    party_size: int,
    time_start: str = "18:00",
    time_end: str = "21:00",
) -> list[AvailabilitySlot]:
    """Check OpenTable availability for a restaurant on a given date."""
    url = f"{OPENTABLE_BASE}/dapi/fe/gql"

    # Use the middle of the time range as the target time for the query
    start_hour = int(time_start.split(":")[0])
    end_hour = int(time_end.split(":")[0])
    mid_hour = (start_hour + end_hour) // 2
    date_time = f"{target_date.isoformat()}T{mid_hour:02d}:00"

    gql_query = {
        "operationName": "RestaurantAvailability",
        "variables": {
            "rid": int(restaurant_id),
            "partySize": party_size,
            "dateTime": date_time,
            "channelId": 1,
        },
        "query": """
            query RestaurantAvailability($rid: Int!, $partySize: Int!, $dateTime: String!, $channelId: Int!) {
                availability(rid: $rid, partySize: $partySize, dateTime: $dateTime, channelId: $channelId) {
                    timeSlots {
                        dateTime
                        isAvailable
                        token
                    }
                }
            }
        """,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(url, json=gql_query, headers=HEADERS)
            resp.raise_for_status()
            data = resp.json()

            time_slots = (
                data.get("data", {})
                .get("availability", {})
                .get("timeSlots", [])
            )

            results: list[AvailabilitySlot] = []
            for slot in time_slots:
                if not slot.get("isAvailable", False):
                    continue

                slot_time_str = slot.get("dateTime", "")
                # Extract just the time portion (HH:MM)
                if "T" in slot_time_str:
                    slot_time = slot_time_str.split("T")[1][:5]
                else:
                    slot_time = slot_time_str

                # Filter to requested time range
                if time_start <= slot_time <= time_end:
                    token = slot.get("token", "")
                    booking_url = (
                        f"{OPENTABLE_BASE}/booking/wizard?"
                        f"rid={restaurant_id}"
                        f"&partySize={party_size}"
                        f"&dateTime={slot_time_str}"
                    )
                    results.append(
                        AvailabilitySlot(
                            time=slot_time,
                            booking_token=token,
                            booking_url=booking_url,
                        )
                    )

            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenTable availability HTTP error: {e.response.status_code}")
            return []
        except Exception as e:
            logger.error(f"OpenTable availability error: {e}")
            return []
