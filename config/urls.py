from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

urlpatterns = [
    path("", RedirectView.as_view(pattern_name="reports:dashboard", permanent=False)),
    path("django-admin/", admin.site.urls),  # built-in Django admin (superuser use)
    path("accounts/", include("accounts.urls")),
    path("reports/", include("reports.urls")),
    path("locator/", include("locator.urls")),
    path("panel/", include("admin_panel.urls")),  # our custom admin panel
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
