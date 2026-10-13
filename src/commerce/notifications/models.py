from django.conf import settings
from django.core.validators import MaxLengthValidator
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        WELCOME = "WELCOME", "Welcome"
        ORDER_PLACED = "ORDER_PLACED", "Order Placed"
        PAYMENT_SUCCESS = "PAYMENT_SUCCESS", "Payment Success"
        ORDER_SHIPPED = "ORDER_SHIPPED", "Order Shipped"
        ORDER_DELIVERED = "ORDER_DELIVERED", "Order Delivered"
        COUPON = "COUPON", "Coupon"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True,
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    title = models.CharField(max_length=150)

    message = models.TextField(
        validators=[MaxLengthValidator(500)]
    )

    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"