import httpx
from datetime import datetime, timedelta
from typing import Optional


OPENTABLE_BASE = "https://mobile-api.opentable.com/api"
OPENTABLE_WEB = "https://www.opentable.com"

HEADERS = {
    "User-Agent": "com.contextoptional.OpenTable/16.5.0.10; iPhone; iOS/17.0; 3.0;",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Accept-Language": "en-US;q=1.0",
}


async def search_restaurants(query: str, latitude: float = 40.7128, longitude: float = -73.9060) -> list[dict]:
    """Search for restaurants on OpenTable using their autocomplete endpoint."""
    async with httpx.AsyncClient(timeout=15) as client:
        # Use the GQL-based search that the OT website uses
        params = {
            "term": query,
            "latitude": latitude,
            "longitude": longitude,
        }
        try:
            resp = await client.get(
                f"{OPENTABLE_BASE}/v2/autocomplete",
                params=params,
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()

            results = []
            # The autocomplete endpoint returns sections with restaurants
            sections = data.get("sections", [])
            for section in sections:
                items = section.get("items", [])
                for item in items:
                    if item.get("type") == "restaurant":
                        restaurant = item.get("restaurant", item)
                        results.append({
                            "id": str(restaurant.get("rid", restaurant.get("id", ""))),
                            "name": restaurant.get("name", ""),
                            "address": restaurant.get("address", ""),
                            "city": restaurant.get("city", restaurant.get("locality", "")),
                            "state": restaurant.get("state", restaurant.get("region", "")),
                            "cuisine": restaurant.get("cuisine", restaurant.get("primaryCuisine", "")),
                            "price": restaurant.get("price", ""),
                            "rating": restaurant.get("rating", restaurant.get("overallRating", "")),
                            "photo_url": restaurant.get("profilePhoto", restaurant.get("photos", {}).get("medium", "")),
                        })
            return results
        except httpx.HTTPStatusError:
            # Fallback: try the restaurant search endpoint
            pass
        except Exception:
            pass

        # Fallback search using a different endpoint
        try:
            search_params = {
                "query": query,
                "latitude": latitude,
                "longitude": longitude,
                "pageSize": 10,
            }
            resp = await client.get(
                f"{OPENTABLE_BASE}/v2/restaurants",
                params=search_params,
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for r in data.get("restaurants", data.get("items", [])):
                results.append({
                    "id": str(r.get("rid", r.get("id", ""))),
                    "name": r.get("name", ""),
                    "address": r.get("address", ""),
                    "city": r.get("city", r.get("locality", "")),
                    "state": r.get("state", r.get("region", "")),
                    "cuisine": r.get("cuisine", r.get("primaryCuisine", "")),
                    "price": r.get("price", ""),
                    "rating": r.get("rating", r.get("overallRating", "")),
                    "photo_url": r.get("profilePhoto", ""),
                })
            return results
        except Exception:
            return []


async def check_availability(
    restaurant_id: str,
    date_str: str,
    time_str: str,
    party_size: int = 2,
) -> list[dict]:
    """
    Check availability for a restaurant on a specific date/time.
    Returns list of available time slots.
    """
    date_time = f"{date_str}T{time_str}"

    payload = {
        "forceNextAvailable": "true",
        "includeNextAvailable": True,
        "dateTime": date_time,
        "requestTicket": "true",
        "allowPop": True,
        "attribution": {
            "partnerId": "84"
        },
        "partySize": party_size,
        "includeOffers": True,
        "requestPremium": "true",
        "requestDateMessages": True,
        "rids": [restaurant_id],
        "requestAttributeTables": "true",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.put(
                f"{OPENTABLE_BASE}/v3/restaurant/availability",
                json=payload,
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()

            availability = data.get("availability", {})
            timeslots = availability.get("timeslots", [])

            slots = []
            for slot in timeslots:
                if slot.get("available", False):
                    slots.append({
                        "dateTime": slot.get("dateTime", ""),
                        "type": slot.get("type", "Standard"),
                        "token": slot.get("token", ""),
                        "slotHash": slot.get("slotHash", ""),
                    })

            return slots
        except Exception as e:
            print(f"Error checking availability for {restaurant_id}: {e}")
            return []


async def check_availability_range(
    restaurant_id: str,
    date_str: str,
    time_start: str,
    time_end: str,
    party_size: int = 2,
) -> list[dict]:
    """
    Check availability across a time range for a given date.
    We check at the midpoint of the range - OpenTable returns nearby slots too.
    """
    # Parse start/end times to find midpoint
    start_h, start_m = map(int, time_start.split(":"))
    end_h, end_m = map(int, time_end.split(":"))

    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    mid_minutes = (start_minutes + end_minutes) // 2
    mid_time = f"{mid_minutes // 60:02d}:{mid_minutes % 60:02d}"

    all_slots = await check_availability(restaurant_id, date_str, mid_time, party_size)

    # Filter slots to only those within our desired time range
    filtered = []
    for slot in all_slots:
        slot_dt = slot.get("dateTime", "")
        if "T" in slot_dt:
            slot_time = slot_dt.split("T")[1][:5]
            if time_start <= slot_time <= time_end:
                filtered.append(slot)

    return filtered


def get_dates_for_monitor(days_of_week: list[int], weeks_ahead: int) -> list[str]:
    """
    Generate dates to check based on days of week and weeks ahead.
    days_of_week: 0=Monday, 1=Tuesday, ..., 6=Sunday
    Returns list of date strings in YYYY-MM-DD format.
    """
    today = datetime.now().date()
    dates = []

    for week in range(weeks_ahead):
        for dow in days_of_week:
            # Calculate the next occurrence of this day of week
            days_until = (dow - today.weekday()) % 7
            if days_until == 0 and week == 0:
                # Include today if it matches
                target = today
            else:
                target = today + timedelta(days=days_until + (week * 7))

            if target >= today:
                date_str = target.strftime("%Y-%m-%d")
                if date_str not in dates:
                    dates.append(date_str)

    dates.sort()
    return dates
