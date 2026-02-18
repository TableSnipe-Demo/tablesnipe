import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

AVAILABILITY_URL = "https://www.opentable.com/dapi/fe/gql"
MOBILE_AVAILABILITY_URL = "https://mobile-api.opentable.com/api/v3/restaurant/availability"
LOCK_URL = "https://mobile-api.opentable.com/api/v1/reservation/"

# Default availability token
DEFAULT_AVAILABILITY_TOKEN = "eyJ2IjoyLCJtIjoxLCJwIjoxLCJzIjowLCJuIjowfQ"


async def check_availability(
    restaurant_id: str,
    date_time: str,
    party_size: int,
    auth_token: str,
) -> dict:
    """
    Check availability for a restaurant on OpenTable.

    Args:
        restaurant_id: The OpenTable restaurant ID (numeric string from URL)
        date_time: ISO format datetime string e.g. "2024-03-15T19:00"
        party_size: Number of guests
        auth_token: Bearer token for OpenTable API

    Returns:
        dict with availability info including timeslots
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
        "User-Agent": "com.contextoptional.OpenTable/16.5.0.0; iPhone; iOS/17.0; 3.0;",
        "Accept": "application/json",
    }

    data = {
        "forceNextAvailable": "true",
        "includeNextAvailable": True,
        "availabilityToken": DEFAULT_AVAILABILITY_TOKEN,
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.put(
                MOBILE_AVAILABILITY_URL,
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenTable API error {e.response.status_code}: {e.response.text}")
            return {"error": str(e), "status_code": e.response.status_code}
        except httpx.RequestError as e:
            logger.error(f"OpenTable request error: {e}")
            return {"error": str(e)}


def parse_timeslots(response: dict) -> list[dict]:
    """
    Parse available timeslots from the OpenTable API response.

    Returns list of dicts with keys: datetime, available, token, slot_hash, type
    """
    slots = []
    availability = response.get("availability", {})
    timeslots = availability.get("timeslots", [])

    for slot in timeslots:
        if slot.get("available", False):
            slots.append({
                "datetime": slot.get("dateTime", ""),
                "available": True,
                "token": slot.get("token", ""),
                "slot_hash": slot.get("slotHash", ""),
                "dining_areas": slot.get("diningAreas", []),
                "type": slot.get("type", "Standard"),
            })

    return slots


async def lock_reservation(
    restaurant_id: str,
    date_time: str,
    party_size: int,
    slot_hash: str,
    auth_token: str,
    dining_area_id: str = "1",
    table_attribute: str = "default",
) -> dict:
    """
    Lock a reservation slot on OpenTable. This is the first step of booking.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
        "User-Agent": "com.contextoptional.OpenTable/16.5.0.0; iPhone; iOS/17.0; 3.0;",
        "Accept": "application/json",
    }

    data = {
        "partySize": party_size,
        "dateTime": date_time,
        "selectedDiningArea": {
            "tableAttribute": table_attribute,
            "diningAreaId": dining_area_id,
        },
        "hash": slot_hash,
        "attribution": {"partnerId": "84"},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                LOCK_URL,
                headers=headers,
                json=data,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Lock reservation error {e.response.status_code}: {e.response.text}")
            return {"error": str(e), "status_code": e.response.status_code}
        except httpx.RequestError as e:
            logger.error(f"Lock reservation request error: {e}")
            return {"error": str(e)}


def get_opentable_url(restaurant_id: str, date_time: str, party_size: int) -> str:
    """Generate a direct OpenTable booking URL as fallback."""
    return (
        f"https://www.opentable.com/restref/client/?restref={restaurant_id}"
        f"&datetime={date_time}&covers={party_size}&lang=en-US"
    )
