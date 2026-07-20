from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    """Extra info attached to Django's built-in User model."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone_number = models.CharField(max_length=15, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("M", "Male"), ("F", "Female"), ("O", "Other")],
        blank=True,
    )

    # Last known location, captured via browser geolocation on the frontend.
    # Used to find nearby hospitals / clinics / pharmacies.
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)
    last_location_updated = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

    @property
    def has_location(self):
        return self.last_latitude is not None and self.last_longitude is not None
