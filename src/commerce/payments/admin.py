from django.contrib import admin

from .models import Payment, StripeWebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "payment_method",
        "payment_status",
        "transaction_id",
        "stripe_session_id",
        "amount",
        "paid_at",
    )

    search_fields = (
        "transaction_id",
        "stripe_session_id",
    )

    list_filter = (
        "payment_method",
        "payment_status",
    )

    ordering = (
        "-created_at",
    )


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = (
        "event_id",
        "event_type",
        "created_at",
    )
    search_fields = (
        "event_id",
        "event_type",
    )
    list_filter = (
        "event_type",
    )
    ordering = (
        "-created_at",
    )
