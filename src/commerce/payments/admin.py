from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "payment_method",
        "payment_status",
        "amount",
        "paid_at",
    )

    search_fields = (
        "transaction_id",
    )

    list_filter = (
        "payment_method",
        "payment_status",
    )

    ordering = (
        "-created_at",
    )