from django.urls import path
from .views import (
    CreatePaymentView, 
    PaymentListView, 
    PaymentDetailView,
    AdminPaymentListView,
    AdminPaymentDetailView,
    UpdatePaymentStatusView,
    RazorpayVerifyPaymentView,
    PaymentConfigView,
    RazorpayWebhookView,
)

urlpatterns = [
    # Customer APIs
    path("orders/<int:order_id>/payments/", CreatePaymentView.as_view(), name="create-payment"),
    path("razorpay/verify/", RazorpayVerifyPaymentView.as_view(), name="razorpay-verify"),
    path("orders/<int:order_id>/razorpay/verify/", RazorpayVerifyPaymentView.as_view(), name="order-razorpay-verify"),
    path("config/", PaymentConfigView.as_view(), name="payment-config"),
    path("razorpay/webhook/", RazorpayWebhookView.as_view(), name="razorpay-webhook"),
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),

    # Admin APIs
    path("admin/payments/", AdminPaymentListView.as_view(), name="admin-payment-list"),
    path("admin/payments/<int:pk>/", AdminPaymentDetailView.as_view(), name="admin-payment-detail"),
    path("admin/payments/<int:pk>/status/", UpdatePaymentStatusView.as_view(), name="admin-update-payment-status"),
]