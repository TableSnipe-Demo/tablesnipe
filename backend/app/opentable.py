import httpx
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

OPENTABLE_AVAILABILITY_URL = "https://mobile-api.opentable.com/api/v3/restaurant/availability"


async def check_availability(
    restaurant_opentable_id: str,
    date_time: str,
    party_size: int,
    bearer_token: str,
) -> dict:
    """Check OpenTable availability for a specific restaurant, date/time, and party size."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {bearer_token}",
        "User-Agent": "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
        "Accept": "application/json",
    }

    data = {
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
        "rids": [restaurant_opentable_id],
        "requestAttributeTables": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                OPENTABLE_AVAILABILITY_URL,
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenTable API error: {e.response.status_code} - {e.response.text}")
        return {"error": str(e), "status_code": e.response.status_code}
    except Exception as e:
        logger.error(f"OpenTable API request failed: {e}")
        return {"error": str(e)}


def parse_available_slots(response: dict) -> list[dict]:
    """Extract available time slots from an OpenTable API response."""
    slots = []
    availability = response.get("availability", {})
    timeslots = availability.get("timeslots", [])

    for slot in timeslots:
        if slot.get("available", False):
            slots.append({
                "dateTime": slot.get("dateTime", ""),
                "slotHash": slot.get("slotHash", ""),
                "token": slot.get("token", ""),
                "type": slot.get("type", "Standard"),
                "diningAreas": slot.get("diningAreas", []),
            })

    return slots


def generate_check_dates(
    days_of_week: list[int],
    time_start: str,
    time_end: str,
    weeks_ahead: int,
) -> list[str]:
    """Generate date/time strings to check based on monitor config.
    
    days_of_week: list of ISO weekday numbers (1=Monday, 7=Sunday)
    time_start/time_end: "HH:MM" format
    weeks_ahead: how many weeks ahead to look
    """
    dates = []
    today = datetime.now().date()
    start_hour, start_min = map(int, time_start.split(":"))
    end_hour, end_min = map(int, time_end.split(":"))

    for week in range(weeks_ahead):
        for day_offset in range(7):
            check_date = today + timedelta(days=day_offset + (week * 7))
            # ISO weekday: Monday=1, Sunday=7
            if check_date.isoweekday() in days_of_week:
                # Check at 30-minute intervals from start to end
                current_hour = start_hour
                current_min = start_min
                while (current_hour < end_hour) or (current_hour == end_hour and current_min <= end_min):
                    dt_str = f"{check_date.isoformat()}T{current_hour:02d}:{current_min:02d}"
                    dates.append(dt_str)
                    current_min += 30
                    if current_min >= 60:
                        current_min = 0
                        current_hour += 1
    return dates
