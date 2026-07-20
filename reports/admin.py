from django.contrib import admin

from .models import Report, TestReference, TestResult


class TestResultInline(admin.TabularInline):
    model = TestResult
    extra = 0
    readonly_fields = ("test_name", "value", "unit", "normal_min", "normal_max", "is_abnormal")
    can_delete = False


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "status", "uploaded_at", "analyzed_at")
    list_filter = ("status", "uploaded_at")
    search_fields = ("title", "user__username", "user__email")
    inlines = [TestResultInline]


@admin.register(TestReference)
class TestReferenceAdmin(admin.ModelAdmin):
    list_display = ("test_name", "normal_min", "normal_max", "unit")
    search_fields = ("test_name", "aliases")


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ("report", "test_name", "value", "unit", "is_abnormal")
    list_filter = ("is_abnormal",)
    search_fields = ("test_name",)
