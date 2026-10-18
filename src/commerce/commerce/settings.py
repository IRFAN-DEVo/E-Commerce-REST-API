import os
from pathlib import Path
import mimetypes

# Fix for Windows registry MIME type issue where CSS is served as plain text
mimetypes.add_type("text/css", ".css", True)

from django.core.exceptions import ImproperlyConfigured

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent.parent / ".env")
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")

_secret_key = os.environ.get("SECRET_KEY", "").strip()
if not _secret_key:
    if DEBUG:
        _secret_key = "django-insecure-dev-fallback-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured("SECRET_KEY environment variable must be set in production.")
elif not DEBUG and "django-insecure" in _secret_key:
    raise ImproperlyConfigured("Insecure SECRET_KEY cannot be used in production.")

SECRET_KEY = _secret_key

_allowed_hosts = os.environ.get("ALLOWED_HOSTS", "").strip()
if _allowed_hosts:
    ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts.split(",") if h.strip()]
elif DEBUG:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
else:
    raise ImproperlyConfigured("ALLOWED_HOSTS environment variable must be set in production.")

INSTALLED_APPS = [
    "drf_spectacular",
    'rest_framework',
    'django_filters',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'frontend',
    'cart',
    'coupons',
    'notifications',
    'products',
    'orders',
    'payments',
    'reviews',
    'wishlist',
    'dashboard',
    'corsheaders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'commerce.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'commerce.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

_database_url = os.environ.get("DATABASE_URL", "").strip()
if _database_url:
    try:
        import dj_database_url
        DATABASES['default'] = dj_database_url.parse(_database_url, conn_max_age=600)
    except ImportError:
        if not DEBUG:
            raise ImproperlyConfigured("dj-database-url is required to parse DATABASE_URL in production.")
elif not DEBUG and not os.environ.get("ALLOW_SQLITE_IN_PRODUCTION", "").lower() in ("true", "1", "yes"):
    raise ImproperlyConfigured(
        "DATABASE_URL environment variable must be set in production. "
        "Production cannot silently fall back to SQLite."
    )

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',
]

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_PAGINATION_CLASS": "api.v1.products.pagination.ProductPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "api-login": "10/minute",
        "api-register": "5/minute",
        "forgot_password": "5/hour",
        "verify_otp": "20/minute",
    }
}

SPECTACULAR_SETTINGS = {
    "TITLE": "E-Commerce REST API",
    "DESCRIPTION": "A robust API for an E-Commerce platform",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# Email Configuration
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@djangomart.com")
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False").lower() in ("true", "1", "yes")

# Payment Gateway Configuration (Environment-driven, dummy fallbacks in dev only)
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "dummy_stripe_secret_key" if DEBUG else "")
STRIPE_PUBLIC_KEY = os.environ.get("STRIPE_PUBLIC_KEY", "dummy_stripe_public_key" if DEBUG else "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "dummy_stripe_webhook_secret" if DEBUG else "")

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "dummy_paypal_client_id" if DEBUG else "")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET", "dummy_paypal_secret" if DEBUG else "")

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "dummy_razorpay_key_id" if DEBUG else "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "dummy_razorpay_key_secret" if DEBUG else "")

# CORS and CSRF Configuration
from corsheaders.defaults import default_headers

CORS_ALLOW_ALL_ORIGINS = False

_cors_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
if _cors_origins_env:
    CORS_ALLOWED_ORIGINS = [orig.strip() for orig in _cors_origins_env.split(",") if orig.strip()]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
else:
    CORS_ALLOWED_ORIGINS = []

# JWT is sent via the Authorization header, not cookies.
# Credentialed CORS (Access-Control-Allow-Credentials) is unnecessary
# and would be a security risk with broad origin lists.
CORS_ALLOW_CREDENTIALS = False

# 'authorization' is already in django-cors-headers' default_headers,
# so no additional headers need to be added.
CORS_ALLOW_HEADERS = list(default_headers)

_csrf_origins_env = os.environ.get("CSRF_TRUSTED_ORIGINS", "").strip()
if _csrf_origins_env:
    CSRF_TRUSTED_ORIGINS = [orig.strip() for orig in _csrf_origins_env.split(",") if orig.strip()]
elif DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
else:
    CSRF_TRUSTED_ORIGINS = []

# Production Security Headers (Active when DEBUG is False)
if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    CSRF_COOKIE_SECURE = os.environ.get("CSRF_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "False").lower() in ("true", "1", "yes")

    # HSTS — instruct browsers to only use HTTPS for the domain.
    # Start with a short value (e.g. 300) during initial deployment,
    # then increase to 31536000 (1 year) once HTTPS is confirmed working.
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", 0))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS", "False"
    ).lower() in ("true", "1", "yes")
    SECURE_HSTS_PRELOAD = os.environ.get(
        "SECURE_HSTS_PRELOAD", "False"
    ).lower() in ("true", "1", "yes")

    # Reverse Proxy SSL Header — set this when behind a TLS-terminating
    # proxy (e.g. Nginx, AWS ALB) so Django knows the request was HTTPS.
    _proxy_ssl_header = os.environ.get("SECURE_PROXY_SSL_HEADER", "").strip()
    if _proxy_ssl_header:
        # Django requires the WSGI request.META key format: 'HTTP_<NAME>'
        if not _proxy_ssl_header.startswith("HTTP_"):
            _proxy_ssl_header = f"HTTP_{_proxy_ssl_header.upper().replace('-', '_')}"
        SECURE_PROXY_SSL_HEADER = (_proxy_ssl_header, "https")

# ---------------------------------------------------------------------------
# Email Configuration
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@djangomart.com")

