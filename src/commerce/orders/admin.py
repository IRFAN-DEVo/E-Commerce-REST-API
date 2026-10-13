from django.contrib import admin

from .models import (
    Order,
    OrderItem,
    ShippingAddress,
)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "status",
        "total_price",
        "created_at",
    )

    search_fields = (
        "user__username",
    )

    list_filter = (
        "status",
    )

    ordering = (
        "-created_at",
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product",
        "quantity",
        "price",
        "sub_total",
    )

    search_fields = (
        "product__name",
    )


@admin.register(ShippingAddress)
class ShippingAddressAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "full_name",
        "city",
        "country",
    )

    search_fields = (
        "full_name",
        "city",
    )