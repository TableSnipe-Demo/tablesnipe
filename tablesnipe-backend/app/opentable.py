import json
import logging
import time
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

OPENTABLE_BASE_URL = "https://mobile-api.opentable.com"

DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
}

DEFAULT_COOKIES = {"OT-Session-Update-Date": str(int(time.time()))}


async def search_restaurants(query: str) -> list[dict]:
    """Search OpenTable for restaurants by name."""
    url = f"{OPENTABLE_BASE_URL}/api/v2/autocomplete"
    params = {"query": query}
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=DEFAULT_HEADERS)
        if response.status_code != 200:
            logger.error(f"OpenTable search failed: {response.status_code} {response.text}")
            return []
        data = response.json()
        restaurants = []
        for section in data.get("sections", []):
            for item in section.get("items", []):
                if item.get("type") == "restaurant":
                    restaurants.append({
                        "id": str(item.get("rid", "")),
                        "name": item.get("name", ""),
                        "locality": item.get("locality", ""),
                        "region": item.get("region", ""),
                        "cuisine": item.get("cuisine", ""),
                    })
        return restaurants


async def check_availability(
    restaurant_id: str,
    date_str: str,
    time_str: str,
    party_size: int,
    bearer_token: str | None = None,
) -> list[dict]:
    """Check availability for a specific restaurant, date, time, and party size.

    Returns list of available time slots.
    """
    date_time = f"{date_str}T{time_str}"

    headers = {**DEFAULT_HEADERS}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

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
        "rids": [restaurant_id],
        "requestAttributeTables": "true",
    }

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{OPENTABLE_BASE_URL}/api/v3/restaurant/availability",
            headers=headers,
            cookies=DEFAULT_COOKIES,
            content=json.dumps(data),
        )

    if response.status_code != 200:
        logger.error(f"OpenTable availability check failed: {response.status_code} {response.text}")
        return []

    result = response.json()
    slots = []

    # Check direct availability
    availability = result.get("availability", {})
    for slot in availability.get("timeslots", []):
        if slot.get("available", False):
            slots.append({
                "dateTime": slot["dateTime"],
                "slotHash": slot.get("slotHash", ""),
                "token": slot.get("token", ""),
                "type": slot.get("type", "Standard"),
                "diningAreas": slot.get("diningAreas", []),
            })

    # Check suggested availability
    for day in result.get("suggestedAvailability", []):
        if isinstance(day, dict) and "timeslots" in day:
            for slot in day["timeslots"]:
                if slot.get("available", True):
                    slots.append({
                        "dateTime": slot["dateTime"],
                        "slotHash": slot.get("slotHash", ""),
                        "token": slot.get("token", ""),
                        "type": slot.get("type", "Standard"),
                        "diningAreas": slot.get("diningAreas", []),
                    })

    return slots


async def lock_reservation(
    restaurant_id: str,
    party_size: int,
    date_time: str,
    slot_hash: str,
    bearer_token: str | None = None,
) -> dict | None:
    """Lock a reservation slot. Returns lock data or None on failure."""
    headers = {**DEFAULT_HEADERS}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    data = {
        "partySize": party_size,
        "dateTime": date_time,
        "selectedDiningArea": {
            "tableAttribute": "default",
            "diningAreaId": "1",
        },
        "hash": slot_hash,
        "attribution": {"partnerId": "84"},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OPENTABLE_BASE_URL}/api/v1/reservation/{restaurant_id}/lock",
            headers=headers,
            cookies=DEFAULT_COOKIES,
            content=json.dumps(data),
        )

    if response.status_code != 200:
        logger.error(f"Failed to lock reservation: {response.status_code} {response.text}")
        return None

    return response.json()


async def complete_reservation(
    restaurant_id: str,
    party_size: int,
    date_time: str,
    slot_hash: str,
    slot_token: str,
    lock_id: str,
    phone_number: str,
    bearer_token: str | None = None,
    gpid: str | None = None,
    diner_id: str | None = None,
) -> dict | None:
    """Complete a reservation after locking. Returns reservation data or None on failure."""
    headers = {**DEFAULT_HEADERS}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    data = {
        "diningFormOptIn": True,
        "partySize": party_size,
        "countryId": "US",
        "attribution": {"partnerId": "84"},
        "loyaltyProgramOptIn": True,
        "optIns": {
            "smsNotifications": {"reservationSms": True, "waitlistSms": False},
            "openTableDataSharing": {
                "businessPartners": True,
                "corporateGroup": True,
                "pointOfSale": True,
            },
            "dataSharing": {
                "guestShare": True,
                "dinerProfileShare": True,
                "sync": True,
            },
            "restaurantEmailMarketing": {"restaurantEmails": True},
            "emailNotifications": {"diningFeedback": True},
            "emailMarketing": {
                "newHot": False,
                "restaurantWeek": False,
                "spotlight": False,
                "product": False,
                "promotional": False,
                "insider": False,
                "dinersChoice": False,
            },
        },
        "hash": slot_hash,
        "loadInvitations": False,
        "number": phone_number,
        "notes": "",
        "slotAvailabilityToken": slot_token,
        "selectedDiningArea": {
            "diningAreaId": "1",
            "tableAttribute": "default",
        },
        "lockId": lock_id,
        "dateTime": date_time,
    }

    if gpid:
        data["gpid"] = gpid
    if diner_id:
        data["dinerId"] = diner_id

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OPENTABLE_BASE_URL}/api/v1/reservation/{restaurant_id}",
            headers=headers,
            cookies=DEFAULT_COOKIES,
            content=json.dumps(data),
        )

    if response.status_code != 200:
        logger.error(f"Failed to complete reservation: {response.status_code} {response.text}")
        return None

    try:
        return response.json()
    except Exception:
        logger.error(f"Failed to parse reservation response: {response.text}")
        return None


def get_target_dates(days_of_week: list[int], weeks_ahead: int) -> list[str]:
    """Generate target dates based on days of week and weeks ahead.

    days_of_week: list of ISO weekday numbers (1=Monday, 7=Sunday)
    weeks_ahead: how many weeks ahead to look
    """
    today = datetime.now().date()
    dates = []

    for week in range(weeks_ahead):
        for day in days_of_week:
            # Calculate the date for this day of week in this future week
            current_weekday = today.isoweekday()
            days_until = (day - current_weekday) + (week * 7)
            if days_until < 0 and week == 0:
                continue  # Skip past days in current week
            target_date = today + timedelta(days=days_until)
            if target_date > today:
                dates.append(target_date.strftime("%Y-%m-%d"))

    return sorted(set(dates))
