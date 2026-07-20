from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


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
    current_place_name = models.CharField(max_length=255, blank=True)
    current_full_address = models.TextField(blank=True)
    last_location_updated = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

    @property
    def has_location(self):
        return self.last_latitude is not None and self.last_longitude is not None


class PasswordOTP(models.Model):
    """Short-lived, single-use email OTP for password operations."""

    PURPOSE_FORGOT = "forgot"
    PURPOSE_CHANGE = "change"
    PURPOSE_CHOICES = [
        (PURPOSE_FORGOT, "Forgot password"),
        (PURPOSE_CHANGE, "Change password"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_otps"
    )
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "purpose", "created_at"]),
        ]

    def set_code(self, code):
        self.code_hash = make_password(code)

    def verify(self, code):
        if self.used_at or self.expires_at <= timezone.now():
            return False
        return check_password(code, self.code_hash)

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])
