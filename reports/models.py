from django.contrib.auth.models import User
from django.db import models


def report_upload_path(instance, filename):
    return f"reports/user_{instance.user_id}/{filename}"


class Report(models.Model):
    """A single uploaded lab report PDF and its overall analysis status."""

    STATUS_PENDING = "pending"
    STATUS_NORMAL = "normal"
    STATUS_ABNORMAL = "abnormal"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending Analysis"),
        (STATUS_NORMAL, "All Normal"),
        (STATUS_ABNORMAL, "Abnormal Findings"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    title = models.CharField(max_length=255, blank=True)
    pdf_file = models.FileField(upload_to=report_upload_path)
    raw_extracted_text = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    parse_error = models.TextField(blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.title or 'Report'} - {self.user.username} ({self.uploaded_at:%Y-%m-%d})"

    @property
    def abnormal_results(self):
        return self.results.filter(is_abnormal=True)

    @property
    def is_all_normal(self):
        return self.status == self.STATUS_NORMAL


class TestReference(models.Model):
    """Master data: normal range for a given lab test (admin-maintained)."""

    test_name = models.CharField(max_length=150, unique=True)
    aliases = models.CharField(
        max_length=500,
        blank=True,
        help_text="Comma-separated alternate names/abbreviations found in PDFs, e.g. 'HB, Hb, Hemoglobin'",
    )
    unit = models.CharField(max_length=30, blank=True)
    normal_min = models.FloatField()
    normal_max = models.FloatField()

    class Meta:
        ordering = ["test_name"]

    def __str__(self):
        return f"{self.test_name} ({self.normal_min}-{self.normal_max} {self.unit})"

    def alias_list(self):
        return [a.strip().lower() for a in self.aliases.split(",") if a.strip()]


class TestResult(models.Model):
    """One parsed line-item from a report, compared against TestReference."""

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="results")
    test_name = models.CharField(max_length=150)
    value = models.FloatField()
    unit = models.CharField(max_length=30, blank=True)
    normal_min = models.FloatField(null=True, blank=True)
    normal_max = models.FloatField(null=True, blank=True)
    is_abnormal = models.BooleanField(default=False)
    matched_reference = models.ForeignKey(
        TestReference, null=True, blank=True, on_delete=models.SET_NULL
    )

    def __str__(self):
        return f"{self.test_name}: {self.value} {self.unit}"

    @property
    def direction(self):
        """'high', 'low' or 'normal' relative to reference range."""
        if self.normal_min is None or self.normal_max is None:
            return "unknown"
        if self.value > self.normal_max:
            return "high"
        if self.value < self.normal_min:
            return "low"
        return "normal"
