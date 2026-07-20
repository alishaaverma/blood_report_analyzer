"""
Location-based search for nearby hospitals, clinics, and pharmacies.

Default implementation uses the free OpenStreetMap Overpass API (no API key
required) — good for a demo/MVP. If settings.GOOGLE_PLACES_API_KEY is set,
Google Places is used instead for richer, more accurate results
(ratings, opening hours, etc).
"""
import requests
from django.conf import settings

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tag -> our category label
OSM_AMENITY_MAP = {
    "hospital": "hospital",
    "clinic": "clinic",
    "doctors": "doctor",
    "pharmacy": "pharmacy",
}


def find_nearby_places(lat, lng, radius_m=5000, categories=None):
    """
    Returns a list of dicts:
        {"name": str, "category": str, "lat": float, "lng": float, "address": str}
    """
    if settings.GOOGLE_PLACES_API_KEY:
        return _find_nearby_google(lat, lng, radius_m, categories)
    return _find_nearby_overpass(lat, lng, radius_m, categories)


def _find_nearby_overpass(lat, lng, radius_m, categories):
    categories = categories or list(OSM_AMENITY_MAP.keys())
    amenity_filter = "|".join(categories)

    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"^({amenity_filter})$"](around:{radius_m},{lat},{lng});
      way["amenity"~"^({amenity_filter})$"](around:{radius_m},{lat},{lng});
    );
    out center 20;
    """
    try:
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=20)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        return []

    results = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        amenity = tags.get("amenity")
        if not name or amenity not in OSM_AMENITY_MAP:
            continue

        el_lat = el.get("lat") or el.get("center", {}).get("lat")
        el_lng = el.get("lon") or el.get("center", {}).get("lon")
        if el_lat is None or el_lng is None:
            continue

        address_parts = [
            tags.get("addr:housenumber", ""),
            tags.get("addr:street", ""),
            tags.get("addr:city", ""),
        ]
        address = ", ".join(p for p in address_parts if p) or "Address not available"

        results.append(
            {
                "name": name,
                "category": OSM_AMENITY_MAP[amenity],
                "lat": el_lat,
                "lng": el_lng,
                "address": address,
            }
        )
    return results[:20]


def _find_nearby_google(lat, lng, radius_m, categories):
    """Optional: richer results via Google Places Nearby Search API."""
    categories = categories or ["hospital", "pharmacy", "doctor"]
    results = []
    for category in categories:
        try:
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={
                    "location": f"{lat},{lng}",
                    "radius": radius_m,
                    "type": category,
                    "key": settings.GOOGLE_PLACES_API_KEY,
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, ValueError):
            continue

        for place in data.get("results", []):
            loc = place.get("geometry", {}).get("location", {})
            results.append(
                {
                    "name": place.get("name"),
                    "category": category,
                    "lat": loc.get("lat"),
                    "lng": loc.get("lng"),
                    "address": place.get("vicinity", "Address not available"),
                    "rating": place.get("rating"),
                }
            )
    return results
