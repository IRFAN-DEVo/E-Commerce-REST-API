from django.urls import path
from .views import DashboardView,FluctuationView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("fluctuations/", FluctuationView.as_view(), name="fluctuations"),
]