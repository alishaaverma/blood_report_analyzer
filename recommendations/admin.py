from django.contrib import admin

from .models import ConditionMapping, GeneralRecommendation, MedicineStore


@admin.register(ConditionMapping)
class ConditionMappingAdmin(admin.ModelAdmin):
    list_display = ("test_name", "direction", "condition_name", "consult_specialty")
    list_filter = ("direction", "consult_specialty")
    search_fields = ("test_name", "condition_name")


@admin.register(GeneralRecommendation)
class GeneralRecommendationAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active")


@admin.register(MedicineStore)
class MedicineStoreAdmin(admin.ModelAdmin):
    list_display = ("medicine_name", "store_type", "store_name", "online_store_name")
    list_filter = ("store_type",)
    search_fields = ("medicine_name", "store_name", "online_store_name")
