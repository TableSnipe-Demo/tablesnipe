import httpx
import json
from datetime import datetime, timedelta
from typing import Any


OPENTABLE_AVAILABILITY_URL = "https://mobile-api.opentable.com/api/v3/restaurant/availability"
OPENTABLE_SEARCH_URL = "https://mobile-api.opentable.com/api/v2/restaurants"


async def search_restaurants(query: str, bearer_token: str = "") -> list[dict]:
    """Search for restaurants on OpenTable by name/location."""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
    }
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    params = {
        "query": query,
        "latitude": 40.7128,
        "longitude": -74.0060,
        "pageSize": 10,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(OPENTABLE_SEARCH_URL, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                restaurants = []
                for r in data.get("restaurants", data.get("items", [])):
                    restaurants.append({
                        "id": str(r.get("rid", r.get("id", ""))),
                        "name": r.get("name", ""),
                        "cuisine": r.get("cuisineType", r.get("cuisine", "")),
                        "neighborhood": r.get("neighborhood", r.get("location", "")),
                        "price": r.get("priceBand", r.get("price", "")),
                        "rating": r.get("overallRating", r.get("rating", 0)),
                        "city": r.get("city", ""),
                    })
                return restaurants
        except Exception as e:
            print(f"OpenTable search error: {e}")

    return []


async def check_availability(
    restaurant_id: str,
    date_str: str,
    time_str: str,
    party_size: int,
    bearer_token: str = "",
) -> list[dict]:
    """Check availability for a specific restaurant, date, time, and party size."""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
    }
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    date_time = f"{date_str}T{time_str}"

    payload = {
        "forceNextAvailable": "true",
        "includeNextAvailable": True,
        "availabilityToken": "eyJ2IjoyLCJtIjoxLCJwIjoxLCJzIjowLCJuIjowfQ",
        "dateTime": date_time,
        "requestTicket": "true",
        "allowPop": True,
        "attribution": {"partnerId": "84"},
        "partySize": party_size,
        "includeOffers": True,
        "requestPremium": "true",
        "requestDateMessages": True,
        "rids": [restaurant_id],
        "requestAttributeTables": "true",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.put(
                OPENTABLE_AVAILABILITY_URL,
                headers=headers,
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                availability = data.get("availability", {})
                timeslots = availability.get("timeslots", [])

                slots = []
                for slot in timeslots:
                    if slot.get("available", False):
                        slot_dt = slot.get("dateTime", "")
                        slots.append({
                            "dateTime": slot_dt,
                            "date": slot_dt.split("T")[0] if "T" in slot_dt else date_str,
                            "time": slot_dt.split("T")[1] if "T" in slot_dt else time_str,
                            "token": slot.get("token", ""),
                            "hash": slot.get("slotHash", ""),
                            "type": slot.get("type", "Standard"),
                            "points": slot.get("points", 0),
                        })
                return slots
            else:
                print(f"OpenTable availability error: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"OpenTable availability exception: {e}")

    return []


def get_dates_for_monitor(days_of_week: list[int], weeks_ahead: int) -> list[str]:
    """Generate list of dates to check based on days of week and weeks ahead.

    days_of_week: list of ints 0=Monday, 6=Sunday
    weeks_ahead: number of weeks to look ahead
    """
    today = datetime.now().date()
    dates = []

    for week in range(weeks_ahead):
        for day in days_of_week:
            target_date = today + timedelta(weeks=week)
            days_until = (day - target_date.weekday()) % 7
            if week == 0 and days_until == 0 and target_date == today:
                days_until = 0  # Include today
            check_date = target_date + timedelta(days=days_until)
            if check_date >= today:
                date_str = check_date.strftime("%Y-%m-%d")
                if date_str not in dates:
                    dates.append(date_str)

    dates.sort()
    return dates


def filter_slots_by_time(slots: list[dict], time_start: str, time_end: str) -> list[dict]:
    """Filter slots that fall within the desired time window."""
    filtered = []
    for slot in slots:
        slot_time = slot.get("time", "")
        if slot_time and time_start <= slot_time <= time_end:
            filtered.append(slot)
    return filtered
