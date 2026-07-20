from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

import requests

from .utils import NearbySearchUnavailable, find_nearby_places


@login_required
def nearby_places(request):
    """
    GET /locator/nearby/?lat=..&lng=..&category=hospital,pharmacy,clinic,doctor
    Falls back to the user's last saved profile location if lat/lng not given.
    """
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")

    if not lat or not lng:
        profile = request.user.profile
        if not profile.has_location:
            return JsonResponse(
                {"error": "No location available. Please share your location."}, status=400
            )
        lat, lng = profile.last_latitude, profile.last_longitude

    categories_param = request.GET.get("category")
    categories = categories_param.split(",") if categories_param else None

    try:
        lat, lng = float(lat), float(lng)
        radius_km = float(request.GET.get("radius_km", 10))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Invalid coordinates"}, status=400)

    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return JsonResponse({"error": "Invalid coordinates"}, status=400)
    if not (1 <= radius_km <= 10):
        return JsonResponse({"error": "Radius must be between 1 and 10 km."}, status=400)

    try:
        places = find_nearby_places(
            lat, lng, radius_m=int(radius_km * 1000), categories=categories
        )
    except (requests.RequestException, NearbySearchUnavailable):
        return JsonResponse(
            {
                "error": "The free OpenStreetMap search is temporarily unavailable. Please try again."
            },
            status=502,
        )
    return JsonResponse(
        {
            "results": places,
            "latitude": lat,
            "longitude": lng,
            "radius_km": radius_km,
        }
    )
