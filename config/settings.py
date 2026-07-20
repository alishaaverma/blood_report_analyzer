"""
Django settings for Blood Report Analyzer project.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_local_env(path):
    """Load simple KEY=VALUE entries without overriding real environment variables."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_local_env(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# SECURITY
# ---------------------------------------------------------------------------
# In production, load this from an environment variable and NEVER commit it.
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-only-secret-key-change-me-before-deploying"
)

# Set DJANGO_DEBUG=False in production
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

# ---------------------------------------------------------------------------
# APPLICATION DEFINITION
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",

    # Local apps
    "accounts",
    "reports",
    "recommendations",
    "locator",
    "admin_panel",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# DATABASE
# ---------------------------------------------------------------------------
# Default: SQLite for easy local development.
# For production, switch to PostgreSQL (recommended) using env vars.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Example PostgreSQL config (uncomment & set env vars for production):
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.environ.get("DB_NAME", "blood_report_db"),
#         "USER": os.environ.get("DB_USER", "postgres"),
#         "PASSWORD": os.environ.get("DB_PASSWORD", ""),
#         "HOST": os.environ.get("DB_HOST", "localhost"),
#         "PORT": os.environ.get("DB_PORT", "5432"),
#     }
# }

# ---------------------------------------------------------------------------
# PASSWORD VALIDATION
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# STATIC & MEDIA FILES
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Max upload size for report PDFs (10 MB)
MAX_UPLOAD_SIZE_MB = 10

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# AUTH REDIRECTS
# ---------------------------------------------------------------------------
LOGIN_URL = "accounts:login"
LOGIN_REDIRECT_URL = "reports:dashboard"
LOGOUT_REDIRECT_URL = "accounts:login"

# ---------------------------------------------------------------------------
# EMAIL & PASSWORD OTP
# ---------------------------------------------------------------------------
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
_configured_email_backend = os.environ.get("EMAIL_BACKEND", "auto")
if _configured_email_backend == "auto":
    EMAIL_BACKEND = (
        "django.core.mail.backends.smtp.EmailBackend"
        if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
        else "django.core.mail.backends.console.EmailBackend"
    )
else:
    EMAIL_BACKEND = _configured_email_backend
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "noreply@bloodreportanalyzer.local",
)
PASSWORD_OTP_EXPIRY_MINUTES = int(
    os.environ.get("PASSWORD_OTP_EXPIRY_MINUTES", "10")
)

# ---------------------------------------------------------------------------
# THIRD-PARTY / EXTERNAL API KEYS
# ---------------------------------------------------------------------------
# Optional: Google Places API key for richer hospital/pharmacy search.
# If not set, the app falls back to the free OpenStreetMap Overpass API.
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
# "osm" uses free OpenStreetMap services and requires no API key.
# Set to "google" only when Google Places (New) is configured.
PLACES_PROVIDER = os.environ.get("PLACES_PROVIDER", "osm").lower()
NOMINATIM_REVERSE_URL = os.environ.get(
    "NOMINATIM_REVERSE_URL",
    "https://nominatim.openstreetmap.org/reverse",
)
OVERPASS_API_URLS = [
    url.strip()
    for url in os.environ.get(
        "OVERPASS_API_URLS",
        (
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter,"
            "https://overpass.private.coffee/api/interpreter,"
            "https://overpass-api.de/api/interpreter,"
            "https://lz4.overpass-api.de/api/interpreter,"
            "https://overpass.kumi.systems/api/interpreter"
        ),
    ).split(",")
    if url.strip()
]
GOOGLE_PLACES_NEARBY_URL = os.environ.get(
    "GOOGLE_PLACES_NEARBY_URL",
    "https://places.googleapis.com/v1/places:searchNearby",
)

# ---------------------------------------------------------------------------
# FILE UPLOAD SECURITY
# ---------------------------------------------------------------------------
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
