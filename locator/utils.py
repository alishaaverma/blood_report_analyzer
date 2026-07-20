"""
Location-based search for nearby hospitals, clinics, and pharmacies.

Default implementation uses the free OpenStreetMap Overpass API (no API key
required) — good for a demo/MVP. If settings.GOOGLE_PLACES_API_KEY is set,
Google Places is used instead for richer, more accurate results
(ratings, opening hours, etc).
"""
from math import asin, cos, radians, sin, sqrt
import re

import requests
from django.conf import settings

# OSM tag -> our category label
OSM_AMENITY_MAP = {
    "hospital": "hospital",
    "clinic": "clinic",
    "doctors": "doctor",
    "pharmacy": "pharmacy",
}


class NearbySearchUnavailable(RuntimeError):
    pass


def reverse_geocode_place(lat, lng):
    """Return a local-area name and full address for a coordinate."""
    try:
        response = requests.get(
            settings.NOMINATIM_REVERSE_URL,
            params={
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
                "accept-language": "en",
            },
            headers={"User-Agent": "BloodReportAnalyzer/1.0"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        address = data.get("address", {})
    except (requests.RequestException, ValueError):
        return {"place_name": "", "full_address": ""}

    locality = ""
    for key in (
        "village",
        "neighbourhood",
        "suburb",
        "quarter",
        "town",
        "city_district",
        "city",
        "municipality",
        "county",
    ):
        candidate = address.get(key, "")
        if candidate and not re.search(r"\b(?:sector|zone)\s*\d+", candidate, re.I):
            locality = candidate
            break
    return {
        "place_name": locality,
        "full_address": data.get("display_name", ""),
    }


def find_nearby_places(lat, lng, radius_m=5000, categories=None):
    """
    Returns a list of dicts:
        {"name": str, "category": str, "lat": float, "lng": float, "address": str}
    """
    if (
        settings.PLACES_PROVIDER == "google"
        and settings.GOOGLE_PLACES_API_KEY
    ):
        results = _find_nearby_google(lat, lng, radius_m, categories)
    else:
        results = _find_nearby_overpass(lat, lng, radius_m, categories)

    for place in results:
        place["distance_km"] = round(
            _distance_km(lat, lng, place["lat"], place["lng"]), 1
        )
    return sorted(results, key=lambda place: place["distance_km"])


def _distance_km(lat1, lng1, lat2, lng2):
    """Calculate straight-line distance between two coordinates."""
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6371 * 2 * asin(sqrt(value))


def _find_nearby_overpass(lat, lng, radius_m, categories):
    categories = categories or list(OSM_AMENITY_MAP.keys())
    amenity_filter = "|".join(categories)

    query = f"""
    [out:json][timeout:25];
    (
      nwr["amenity"~"^({amenity_filter})$"](around:{radius_m},{lat},{lng});
      nwr["healthcare"~"^(hospital|clinic|doctor|pharmacy)$"](around:{radius_m},{lat},{lng});
      nwr["shop"="chemist"](around:{radius_m},{lat},{lng});
    );
    out center 100;
    """
    data = None
    for endpoint in settings.OVERPASS_API_URLS:
        try:
            response = requests.post(
                endpoint,
                data={"data": query},
                headers={
                    "User-Agent": "BloodReportAnalyzer/1.0",
                    "Accept": "application/json",
                },
                timeout=35,
            )
            response.raise_for_status()
            data = response.json()
            break
        except (requests.RequestException, ValueError):
            continue
    if data is None:
        raise NearbySearchUnavailable(
            "The free OpenStreetMap place search is temporarily unavailable. "
            "Please try again shortly."
        )

    results = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        amenity = tags.get("amenity")
        healthcare = tags.get("healthcare")
        shop = tags.get("shop")
        raw_category = amenity or healthcare
        if shop == "chemist":
            category = "pharmacy"
        else:
            category = OSM_AMENITY_MAP.get(raw_category, raw_category)
        if not name or category not in ("hospital", "clinic", "doctor", "pharmacy"):
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
                "category": category,
                "lat": el_lat,
                "lng": el_lng,
                "address": address,
            }
        )
    return results[:50]


def _find_nearby_google(lat, lng, radius_m, categories):
    """Search the current Google Places (New) Nearby Search API."""
    requested = categories or ["hospital", "pharmacy", "doctor", "clinic"]
    type_map = {
        "hospital": "hospital",
        "pharmacy": "pharmacy",
        "doctor": "doctor",
        "doctors": "doctor",
        "clinic": "medical_clinic",
    }
    included_types = list(
        dict.fromkeys(type_map[item] for item in requested if item in type_map)
    )
    if not included_types:
        included_types = ["hospital", "pharmacy", "doctor", "medical_clinic"]

    response = requests.post(
        settings.GOOGLE_PLACES_NEARBY_URL,
        json={
            "includedTypes": included_types,
            "maxResultCount": 20,
            "rankPreference": "DISTANCE",
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": float(radius_m),
                }
            },
        },
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": (
                "places.displayName,places.formattedAddress,places.location,"
                "places.primaryType,places.rating,places.userRatingCount,"
                "places.googleMapsUri"
            ),
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    category_map = {
        "medical_clinic": "clinic",
        "doctor": "doctor",
        "hospital": "hospital",
        "pharmacy": "pharmacy",
    }
    results = []
    for place in data.get("places", []):
        location = place.get("location", {})
        if location.get("latitude") is None or location.get("longitude") is None:
            continue
        results.append(
            {
                "name": place.get("displayName", {}).get("text", "Unnamed place"),
                "category": category_map.get(
                    place.get("primaryType"), place.get("primaryType", "place")
                ),
                "lat": location["latitude"],
                "lng": location["longitude"],
                "address": place.get("formattedAddress", "Address not available"),
                "rating": place.get("rating"),
                "user_rating_count": place.get("userRatingCount"),
                "google_maps_url": place.get("googleMapsUri", ""),
            }
        )
    return results
