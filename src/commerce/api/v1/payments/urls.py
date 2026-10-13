from django.urls import path
from .views import (
    CreatePaymentView, 
    PaymentListView, 
    PaymentDetailView,
    AdminPaymentListView,
    AdminPaymentDetailView,
    UpdatePaymentStatusView
)

urlpatterns = [
    # Customer APIs
    path("orders/<int:order_id>/payments/", CreatePaymentView.as_view(), name="create-payment"),
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),

    # Admin APIs
    path("admin/payments/", AdminPaymentListView.as_view(), name="admin-payment-list"),
    path("admin/payments/<int:pk>/", AdminPaymentDetailView.as_view(), name="admin-payment-detail"),
    path("admin/payments/<int:pk>/status/", UpdatePaymentStatusView.as_view(), name="admin-update-payment-status"),
]