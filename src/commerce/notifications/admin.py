from django.contrib import admin

from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "notification_type",
        "title",
        "is_read",
        "created_at",
        "read_at",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__username",
        "title",
        "message",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "created_at",
        "read_at",
    )

    autocomplete_fields = (
        "user",
        "order",
    )

    list_per_page = 25

    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Notification Information",
            {
                "fields": (
                    "user",
                    "order",
                    "notification_type",
                    "title",
                    "message",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_read",
                    "read_at",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                )
            },
        ),
    )