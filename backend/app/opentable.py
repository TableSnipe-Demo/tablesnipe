import logging
import httpx
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

BASE_URL = "https://www.opentable.com"
GRAPHQL_URL = f"{BASE_URL}/dapi/fe/gql"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": f"{BASE_URL}/",
}

SEARCH_QUERY = """
query RestaurantSearch($term: String!, $first: Int) {
  autocomplete(term: $term, first: $first) {
    restaurants {
      id
      name
      address
      locality
      region
      priceRange
      primaryCuisine {
        name
      }
      photos {
        url
      }
    }
  }
}
"""

AVAILABILITY_QUERY = """
query Availability($rid: ID!, $date: String!, $time: String!, $partySize: Int!) {
  availability(
    restaurantId: $rid
    date: $date
    time: $time
    partySize: $partySize
  ) {
    slots {
      dateTime
      token
      isAvailable
    }
  }
}
"""


async def search_restaurants(query: str, limit: int = 10) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GRAPHQL_URL,
                headers=HEADERS,
                json={
                    "query": SEARCH_QUERY,
                    "variables": {"term": query, "first": limit},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                restaurants = (
                    data.get("data", {})
                    .get("autocomplete", {})
                    .get("restaurants", [])
                )
                results = []
                for r in restaurants:
                    cuisine = ""
                    if r.get("primaryCuisine"):
                        cuisine = r["primaryCuisine"].get("name", "")
                    image_url = ""
                    if r.get("photos") and len(r["photos"]) > 0:
                        image_url = r["photos"][0].get("url", "")
                    results.append({
                        "id": str(r.get("id", "")),
                        "name": r.get("name", ""),
                        "address": r.get("address", ""),
                        "locality": r.get("locality", ""),
                        "region": r.get("region", ""),
                        "price_range": r.get("priceRange", ""),
                        "cuisine": cuisine,
                        "image_url": image_url,
                    })
                return results

            logger.warning(f"GraphQL search failed with status {resp.status_code}: {resp.text[:200]}")
            url = f"{BASE_URL}/dapi/restaurants/search"
            resp2 = await client.get(
                url,
                headers=HEADERS,
                params={"query": query, "pageSize": limit},
            )
            if resp2.status_code == 200:
                data = resp2.json()
                restaurants = data.get("restaurants", [])
                return [
                    {
                        "id": str(r.get("rid", r.get("id", ""))),
                        "name": r.get("name", ""),
                        "address": r.get("address", ""),
                        "locality": r.get("locality", r.get("city", "")),
                        "region": r.get("region", r.get("state", "")),
                        "price_range": r.get("priceRange", r.get("priceBand", "")),
                        "cuisine": r.get("primaryCuisine", r.get("cuisine", "")),
                        "image_url": r.get("profilePhoto", r.get("photos", [""])[0] if r.get("photos") else ""),
                    }
                    for r in restaurants
                ]
            return []
    except Exception as e:
        logger.error(f"Restaurant search error: {e}")
        return []


async def check_availability(
    restaurant_id: str,
    date: str,
    time: str,
    party_size: int,
) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GRAPHQL_URL,
                headers=HEADERS,
                json={
                    "query": AVAILABILITY_QUERY,
                    "variables": {
                        "rid": restaurant_id,
                        "date": date,
                        "time": time,
                        "partySize": party_size,
                    },
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                slots = (
                    data.get("data", {})
                    .get("availability", {})
                    .get("slots", [])
                )
                return [
                    {
                        "datetime": s.get("dateTime", ""),
                        "token": s.get("token", ""),
                        "is_available": s.get("isAvailable", False),
                    }
                    for s in slots
                    if s.get("isAvailable", False)
                ]

            url = f"{BASE_URL}/booking/availability"
            resp2 = await client.get(
                url,
                headers=HEADERS,
                params={
                    "rid": restaurant_id,
                    "datetime": f"{date}T{time}",
                    "partySize": party_size,
                    "includeNextAvailable": "true",
                },
            )
            if resp2.status_code == 200:
                data = resp2.json()
                timeslots = data.get("availability", {}).get("timeslots", [])
                return [
                    {
                        "datetime": s.get("dateTime", ""),
                        "token": s.get("token", s.get("hash", "")),
                        "is_available": True,
                    }
                    for s in timeslots
                    if s.get("isAvailable", True)
                ]
            return []
    except Exception as e:
        logger.error(f"Availability check error: {e}")
        return []


def get_upcoming_dates(day_of_week: str, weeks_ahead: int, time_of_day: str = "") -> list[str]:
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }
    target_day = day_map.get(day_of_week.lower())
    if target_day is None:
        return []

    today = datetime.now()
    dates = []
    days_ahead = (target_day - today.weekday()) % 7
    if days_ahead == 0:
        skip_today = False
        if time_of_day:
            try:
                target_hour = int(time_of_day.split(":")[0])
                skip_today = today.hour >= target_hour
            except (ValueError, IndexError):
                skip_today = today.hour >= 22
        else:
            skip_today = today.hour >= 22
        if skip_today:
            days_ahead = 7
    for week in range(weeks_ahead):
        target_date = today + timedelta(days=days_ahead + (7 * week))
        dates.append(target_date.strftime("%Y-%m-%d"))

    return dates
