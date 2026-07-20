from django.urls import path

from . import views

app_name = "locator"

urlpatterns = [
    path("nearby/", views.nearby_places, name="nearby_places"),
]
