from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse

from .utils import find_nearby_places, reverse_geocode_place


class NearbyPlacesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="location-user", password="test")
        self.client.force_login(self.user)

    def test_rejects_radius_over_ten_km(self):
        response = self.client.get(
            reverse("locator:nearby_places"),
            {"lat": 28.6, "lng": 77.2, "radius_km": 11},
        )
        self.assertEqual(response.status_code, 400)

    @patch("locator.utils._find_nearby_overpass")
    def test_results_include_distance_and_are_sorted(self, mocked_search):
        mocked_search.return_value = [
            {
                "name": "Far Clinic",
                "category": "clinic",
                "lat": 28.7,
                "lng": 77.2,
                "address": "Far Road",
            },
            {
                "name": "Near Pharmacy",
                "category": "pharmacy",
                "lat": 28.601,
                "lng": 77.2,
                "address": "Near Road",
            },
        ]

        results = find_nearby_places(28.6, 77.2, radius_m=10000)

        self.assertEqual(results[0]["name"], "Near Pharmacy")
        self.assertIn("distance_km", results[0])

    @patch("locator.utils.requests.get")
    def test_reverse_geocode_returns_place_without_zone_or_postcode(self, mocked_get):
        mocked_get.return_value.json.return_value = {
            "address": {
                "suburb": "Sector 15",
                "city": "Noida",
                "state": "Uttar Pradesh",
                "postcode": "201301",
                "country": "India",
            }
        }
        mocked_get.return_value.raise_for_status.return_value = None

        place = reverse_geocode_place(28.58, 77.34)

        self.assertEqual(place["place_name"], "Noida")
        self.assertNotIn("28.58", place["full_address"])

    @override_settings(
        GOOGLE_PLACES_API_KEY="test-key",
        PLACES_PROVIDER="google",
    )
    @patch("locator.utils.requests.post")
    def test_google_places_new_results_are_normalized(self, mocked_post):
        mocked_post.return_value.raise_for_status.return_value = None
        mocked_post.return_value.json.return_value = {
            "places": [
                {
                    "displayName": {"text": "Known Pharmacy"},
                    "formattedAddress": "Main Road, Noida",
                    "location": {"latitude": 28.601, "longitude": 77.2},
                    "primaryType": "pharmacy",
                    "rating": 4.5,
                    "userRatingCount": 42,
                    "googleMapsUri": "https://maps.google.com/example",
                }
            ]
        }

        results = find_nearby_places(
            28.6, 77.2, radius_m=10000, categories=["pharmacy"]
        )

        self.assertEqual(results[0]["name"], "Known Pharmacy")
        self.assertEqual(results[0]["category"], "pharmacy")
        self.assertEqual(
            results[0]["google_maps_url"], "https://maps.google.com/example"
        )
