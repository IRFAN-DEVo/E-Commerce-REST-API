from django.db import models
from orders.models import Order


class Payment(models.Model):

    STATUS_PENDING = "PENDING"
    STATUS_SUCCESS = "SUCCESS"
    STATUS_FAILED = "FAILED"
    STATUS_REFUNDED = "REFUNDED"

    PAYMENT_METHOD_CHOICES = (
        ("COD", "Cash on Delivery"),
        ("RAZORPAY", "Razorpay"),
        ("STRIPE", "Stripe"),
    )

    PAYMENT_STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REFUNDED, "Refunded"),
    )

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="payment"
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="COD"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="PENDING"
    )

    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True
    )

    stripe_session_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True
    )

    REFUND_STATUS_CHOICES = (
        ("NOT_APPLICABLE", "Not Applicable"),
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
        ("MANUAL_PROCESSING_REQUIRED", "Manual Processing Required"),
    )

    refund_status = models.CharField(
        max_length=30,
        choices=REFUND_STATUS_CHOICES,
        default="NOT_APPLICABLE",
    )

    refund_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
    )

    refunded_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment #{self.pk} - {self.order.id}"


class StripeWebhookEvent(models.Model):
    """
    Stores processed Stripe webhook event IDs to guarantee idempotent deduplication
    and prevent replay or duplicate execution attacks.
    """
    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stripe_webhook_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"
