import httpx
from datetime import datetime, timedelta
from typing import Optional


OPENTABLE_BASE = "https://www.opentable.com"


async def search_restaurants(query: str, latitude: Optional[float] = None, longitude: Optional[float] = None) -> list[dict]:
    async with httpx.AsyncClient() as client:
        params = {
            "term": query,
            "latitude": latitude or 40.7128,
            "longitude": longitude or -74.0060,
        }
        resp = await client.get(
            f"{OPENTABLE_BASE}/dapi/fe/gql",
            params={
                "optype": "query",
                "opname": "Autocomplete",
            },
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            timeout=15,
        )
        try:
            url = f"{OPENTABLE_BASE}/dapi/fe/gql"
            payload = {
                "operationName": "Autocomplete",
                "variables": {
                    "term": query,
                    "latitude": latitude or 40.7128,
                    "longitude": longitude or -74.0060,
                },
                "query": """
                    query Autocomplete($term: String!, $latitude: Float!, $longitude: Float!) {
                        autocomplete(term: $term, latitude: $latitude, longitude: $longitude) {
                            restaurants {
                                name
                                rid
                                locality
                                neighborhood
                            }
                        }
                    }
                """,
            }
            resp2 = await client.post(
                url,
                json=payload,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=15,
            )
            if resp2.status_code == 200:
                data = resp2.json()
                restaurants = data.get("data", {}).get("autocomplete", {}).get("restaurants", [])
                return [
                    {
                        "name": r.get("name", ""),
                        "id": str(r.get("rid", "")),
                        "locality": r.get("locality", ""),
                        "neighborhood": r.get("neighborhood", ""),
                    }
                    for r in restaurants
                ]
        except Exception:
            pass

        try:
            search_url = f"{OPENTABLE_BASE}/s"
            params = {"term": query, "queryUnderstandingType": "none", "corrid": "autocomplete"}
            resp3 = await client.get(
                search_url,
                params=params,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Accept": "text/html",
                },
                timeout=15,
                follow_redirects=True,
            )
        except Exception:
            pass

        return []


async def check_availability(
    restaurant_id: str,
    date: str,
    time: str,
    party_size: int,
) -> list[dict]:
    async with httpx.AsyncClient() as client:
        url = f"{OPENTABLE_BASE}/booking/availability"
        params = {
            "rid": restaurant_id,
            "dateTime": f"{date}T{time}",
            "partySize": str(party_size),
            "includeNextAvailable": "true",
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": f"{OPENTABLE_BASE}/r/{restaurant_id}",
        }
        try:
            resp = await client.get(url, params=params, headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                timeslots = data.get("availability", {}).get("timeslots", [])
                return [
                    {
                        "time": slot.get("dateTime", ""),
                        "token": slot.get("token", ""),
                        "type": slot.get("type", ""),
                    }
                    for slot in timeslots
                ]
        except Exception:
            pass

        try:
            url2 = f"{OPENTABLE_BASE}/dapi/fe/gql"
            payload = {
                "operationName": "RestaurantAvailability",
                "variables": {
                    "restaurantIds": [int(restaurant_id)],
                    "date": date,
                    "time": time,
                    "partySize": party_size,
                },
                "query": """
                    query RestaurantAvailability($restaurantIds: [Int!]!, $date: String!, $time: String!, $partySize: Int!) {
                        availability(restaurantIds: $restaurantIds, date: $date, time: $time, partySize: $partySize) {
                            restaurants {
                                restaurantId
                                timeslots {
                                    dateTime
                                    token
                                    type
                                }
                            }
                        }
                    }
                """,
            }
            resp2 = await client.post(
                url2,
                json=payload,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=15,
            )
            if resp2.status_code == 200:
                data = resp2.json()
                avail = data.get("data", {}).get("availability", {}).get("restaurants", [])
                if avail:
                    return [
                        {
                            "time": slot.get("dateTime", ""),
                            "token": slot.get("token", ""),
                            "type": slot.get("type", ""),
                        }
                        for slot in avail[0].get("timeslots", [])
                    ]
        except Exception:
            pass

        return []


def get_dates_for_monitor(days_of_week: list[int], weeks_ahead: int) -> list[str]:
    dates = []
    today = datetime.now().date()
    end_date = today + timedelta(weeks=weeks_ahead)
    current = today + timedelta(days=1)
    while current <= end_date:
        if current.weekday() in days_of_week:
            dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return dates
