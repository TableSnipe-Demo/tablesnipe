import httpx
import datetime
from dataclasses import dataclass


@dataclass
class TimeSlot:
    date_time: str
    available: bool
    slot_hash: str
    token: str
    dining_area_id: str
    table_attribute: str
    points: int
    slot_type: str


@dataclass
class AvailabilityResult:
    restaurant_id: str
    date_time: str
    timeslots: list[TimeSlot]
    min_party_size: int
    max_party_size: int
    error: str | None = None


BASE_URL = "https://mobile-api.opentable.com/api"
DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "com.contextoptional.OpenTable/16.4.0.10; iPhone; iOS/17.0; 3.0;",
}


async def search_restaurants(query: str, auth_token: str) -> list[dict]:
    headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {auth_token}"}
    params = {
        "query": query,
        "latitude": 40.7128,
        "longitude": -74.0060,
        "limit": 20,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{BASE_URL}/v2/restaurant/search", headers=headers, params=params
        )
        response.raise_for_status()
        data = response.json()
        results = []
        for r in data.get("restaurants", data.get("items", [])):
            restaurant = r.get("restaurant", r) if isinstance(r, dict) else r
            results.append(
                {
                    "rid": str(restaurant.get("rid", restaurant.get("id", ""))),
                    "name": restaurant.get("name", ""),
                    "locality": restaurant.get("locality", restaurant.get("city", "")),
                    "region": restaurant.get("region", restaurant.get("state", "")),
                    "cuisine": restaurant.get("cuisine", restaurant.get("cuisineType", "")),
                    "price_range": restaurant.get("priceRange", restaurant.get("priceBand", "")),
                    "rating": restaurant.get("rating", restaurant.get("overallRating", None)),
                    "reviews_count": restaurant.get("reviewsCount", restaurant.get("numReviews", None)),
                }
            )
        return results


async def check_availability(
    restaurant_id: str,
    date_time: str,
    party_size: int,
    auth_token: str,
) -> AvailabilityResult:
    headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {auth_token}"}
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
        "rids": [str(restaurant_id)],
        "requestAttributeTables": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.put(
                f"{BASE_URL}/v3/restaurant/availability",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        availability = data.get("availability", {})
        raw_slots = availability.get("timeslots", [])

        timeslots = []
        for slot in raw_slots:
            if not slot.get("available", False):
                continue
            dining_areas = slot.get("diningAreas", [{}])
            area = dining_areas[0] if dining_areas else {}
            attrs = area.get("availableAttributes", ["default"])
            timeslots.append(
                TimeSlot(
                    date_time=slot.get("dateTime", ""),
                    available=True,
                    slot_hash=slot.get("slotHash", ""),
                    token=slot.get("token", ""),
                    dining_area_id=str(area.get("id", "1")),
                    table_attribute=attrs[0] if attrs else "default",
                    points=slot.get("points", 0),
                    slot_type=slot.get("type", "Standard"),
                )
            )

        return AvailabilityResult(
            restaurant_id=str(restaurant_id),
            date_time=date_time,
            timeslots=timeslots,
            min_party_size=availability.get("minPartySize", 1),
            max_party_size=availability.get("maxPartySize", 20),
        )
    except Exception as e:
        return AvailabilityResult(
            restaurant_id=str(restaurant_id),
            date_time=date_time,
            timeslots=[],
            min_party_size=1,
            max_party_size=20,
            error=str(e),
        )


async def lock_reservation(
    restaurant_id: str,
    date_time: str,
    party_size: int,
    slot_hash: str,
    dining_area_id: str,
    table_attribute: str,
    auth_token: str,
) -> dict:
    headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {auth_token}"}
    payload = {
        "partySize": party_size,
        "dateTime": date_time,
        "selectedDiningArea": {
            "tableAttribute": table_attribute,
            "diningAreaId": dining_area_id,
        },
        "hash": slot_hash,
        "attribution": {"partnerId": "84"},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{BASE_URL}/v1/reservation/{restaurant_id}/lock",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()


async def complete_reservation(
    reservation_lock_id: str,
    restaurant_id: str,
    date_time: str,
    party_size: int,
    slot_hash: str,
    slot_token: str,
    dining_area_id: str,
    table_attribute: str,
    phone_number: str,
    auth_token: str,
) -> dict:
    headers = {**DEFAULT_HEADERS, "Authorization": f"Bearer {auth_token}"}
    payload = {
        "diningFormOptIn": True,
        "partySize": party_size,
        "countryId": "US",
        "attribution": {"partnerId": "84"},
        "loyaltyProgramOptIn": False,
        "optIns": {
            "smsNotifications": {
                "reservationSms": True,
                "waitlistSms": False,
            },
            "openTableDataSharing": {
                "businessPartners": False,
                "corporateGroup": False,
                "pointOfSale": False,
            },
            "dataSharing": {
                "guestShare": False,
                "dinerProfileShare": False,
                "sync": False,
            },
            "restaurantEmailMarketing": {"restaurantEmails": False},
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
        "slotAvailabilityToken": slot_token,
        "selectedDiningArea": {
            "diningAreaId": dining_area_id,
            "tableAttribute": table_attribute,
        },
        "lockId": reservation_lock_id,
        "number": phone_number,
        "notes": "",
        "dateTime": date_time,
        "loadInvitations": False,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{BASE_URL}/v1/reservation/{restaurant_id}/complete",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def get_target_dates(day_of_week: str, weeks_ahead: int) -> list[str]:
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }
    target_day = day_map.get(day_of_week.lower(), 0)
    today = datetime.date.today()
    dates = []
    for week in range(weeks_ahead):
        days_until = (target_day - today.weekday()) % 7
        if days_until == 0 and week == 0:
            days_until = 0
        target_date = today + datetime.timedelta(days=days_until + (week * 7))
        if target_date >= today:
            dates.append(target_date.strftime("%Y-%m-%d"))
    return dates
