from django.db import models


class ConditionMapping(models.Model):
    """
    Maps an abnormal test result (test name + direction) to a probable
    condition and general, non-prescriptive care guidance.

    IMPORTANT: `common_medicines` is informational only (commonly associated
    OTC/medicine categories), NOT a prescription. The app always tells the
    user to confirm with a licensed doctor before taking anything.
    """

    DIRECTION_HIGH = "high"
    DIRECTION_LOW = "low"
    DIRECTION_CHOICES = [(DIRECTION_HIGH, "High"), (DIRECTION_LOW, "Low")]

    test_name = models.CharField(
        max_length=150,
        help_text="Must match a TestReference.test_name exactly, e.g. 'Glucose (Fasting)'",
    )
    direction = models.CharField(max_length=4, choices=DIRECTION_CHOICES)
    condition_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    diet_advice = models.TextField(
        help_text="Diet guidance specifically related to this condition."
    )
    exercise_advice = models.TextField(
        help_text="Exercise guidance specifically related to this condition."
    )
    common_medicines = models.TextField(
        blank=True,
        help_text="Comma-separated general medicine/category names for reference only.",
    )
    consult_specialty = models.CharField(
        max_length=100,
        help_text="e.g. 'Endocrinologist', 'Cardiologist', 'General Physician'",
    )
    severity_note = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ["test_name", "direction"]
        ordering = ["test_name", "direction"]

    def __str__(self):
        return f"{self.test_name} ({self.direction}) -> {self.condition_name}"

    def medicine_list(self):
        medicines = [m.strip() for m in self.common_medicines.split(",") if m.strip()]
        return [
            medicine
            for medicine in medicines
            if not medicine.lower().startswith(
                ("depends entirely", "no general medicine", "none")
            )
        ][:5]


class GeneralRecommendation(models.Model):
    """Fallback diet/exercise advice shown when ALL results are normal."""

    title = models.CharField(max_length=150, default="Stay Healthy")
    diet_advice = models.TextField()
    exercise_advice = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class MedicineStore(models.Model):
    """A place (physical or online) where a recommended medicine can be found."""

    STORE_PHYSICAL = "physical"
    STORE_ONLINE = "online"
    STORE_TYPE_CHOICES = [(STORE_PHYSICAL, "Physical Store"), (STORE_ONLINE, "Online Store")]

    medicine_name = models.CharField(max_length=150)
    store_type = models.CharField(max_length=10, choices=STORE_TYPE_CHOICES)

    # Physical store fields
    store_name = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Online store fields
    online_store_name = models.CharField(max_length=150, blank=True)
    product_url = models.URLField(blank=True)

    class Meta:
        ordering = ["medicine_name", "store_type"]

    def __str__(self):
        label = self.store_name or self.online_store_name or "Store"
        return f"{self.medicine_name} @ {label}"
