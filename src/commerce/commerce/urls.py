"""
URL configuration for commerce project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import (SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView,)
from .views import health_check
from django.views.generic.base import RedirectView

urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url=settings.STATIC_URL + 'favicon.ico', permanent=True)),

    path("admin/", admin.site.urls),

    # Health Check
    path("api/health/", health_check, name="health-check"),

    # Frontend Pages
    path("", include("frontend.urls")),

    #  APIs
    path("api/v1/accounts/", include("api.v1.accounts.urls")),
    path("api/v1/products/", include("api.v1.products.urls")),
    path("api/v1/cart/", include("api.v1.cart.urls")),
    path("api/v1/orders/", include("api.v1.orders.urls")),
    path("api/v1/payments/", include("api.v1.payments.urls")),
    path("api/v1/reviews/", include("api.v1.reviews.urls")),
    path("api/v1/wishlist/", include("api.v1.wishlist.urls")),
    path("api/v1/coupons/", include("api.v1.coupons.urls")),
    path("api/v1/dashboard/", include("api.v1.dashboard.urls")),
    path("api/v1/notifications/", include("api.v1.notifications.urls")),

    # OpenAPI Schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema",),

    # Swagger UI
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui",),

    # ReDoc
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc",),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



#                 Django REST API
#                       │
#                       ▼
#             DRF Spectacular
#                       │
#         Generates OpenAPI 3.0
#                       │
#         ┌─────────────┴─────────────┐
#         ▼                           ▼
#  /api/docs/                  /api/redoc/
#  Swagger UI                     ReDoc
# (Test APIs)              (Read Documentation)