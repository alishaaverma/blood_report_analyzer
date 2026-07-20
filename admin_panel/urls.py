from django.urls import path

from . import views

app_name = "admin_panel"

urlpatterns = [
    path("", views.admin_dashboard, name="dashboard"),
    path("users/", views.user_list, name="user_list"),
    path("users/<int:user_id>/", views.user_detail, name="user_detail"),
    path("users/<int:user_id>/delete/", views.user_delete, name="user_delete"),
    path("reports/<int:report_id>/delete/", views.admin_delete_report, name="delete_report"),
]
