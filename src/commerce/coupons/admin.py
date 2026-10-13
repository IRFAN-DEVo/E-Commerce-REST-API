from django.contrib import admin

from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "discount_type",
        "discount_value",
        "is_active",
        "valid_from",
        "valid_to",
    )

    search_fields = (
        "code",
        "name",
    )

    list_filter = (
        "discount_type",
        "is_active",
    )

    ordering = (
        "-created_at",
    )


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "coupon",
        "order",
        "applied_at",
    )

    search_fields = (
        "user__username",
        "coupon__code",
    )

    ordering = (
        "-applied_at",
    )