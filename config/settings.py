"""
Django settings for Blood Report Analyzer project.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

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
# THIRD-PARTY / EXTERNAL API KEYS
# ---------------------------------------------------------------------------
# Optional: Google Places API key for richer hospital/pharmacy search.
# If not set, the app falls back to the free OpenStreetMap Overpass API.
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

# ---------------------------------------------------------------------------
# FILE UPLOAD SECURITY
# ---------------------------------------------------------------------------
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
