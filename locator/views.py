from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from .utils import find_nearby_places


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
    except ValueError:
        return JsonResponse({"error": "Invalid coordinates"}, status=400)

    places = find_nearby_places(lat, lng, categories=categories)
    return JsonResponse({"results": places})
