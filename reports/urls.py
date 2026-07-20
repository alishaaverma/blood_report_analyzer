from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("upload/", views.upload_report, name="upload"),
    path("<int:pk>/", views.report_detail, name="detail"),
    path("<int:pk>/delete/", views.delete_report, name="delete"),
]
