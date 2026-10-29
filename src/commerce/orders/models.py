from datetime import timedelta
from django.db import models
from django.utils import timezone
from accounts.models import User
from products.models import Product


#order model

class Order(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("SHIPPED", "Shipped"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when the order was cancelled."
    )

    cancellation_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason provided for the cancellation."
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id}"

    @property
    def cancellation_deadline(self):
        """
        Calculates the inclusive 24-hour cancellation deadline based on
        the order's original placement timestamp (created_at).
        """
        if self.created_at:
            return self.created_at + timedelta(hours=24)
        return None

    def get_cancellation_eligibility(self) -> tuple[bool, str]:
        """
        Evaluates server-side business rules to determine if the order is eligible
        for self-service customer cancellation. Returns (is_cancellable, reason_if_not).
        Enforces:
        1. Order is not already cancelled, delivered, or shipped.
        2. Order placement was within the 24-hour window (order.created_at + 24 hours).
        3. Payment status permits self-service cancellation:
           - Unpaid and COD orders can be cancelled directly.
           - Paid orders (Stripe, Razorpay, or COD) within 24 hours before shipment can be cancelled,
             entering the refund processing workflow.
           - Orders with completed or currently in-flight refunds cannot be cancelled again.
        """
        if self.status == "CANCELLED":
            return False, "This order is already cancelled."
        if self.status == "DELIVERED":
            return False, "Delivered orders cannot be cancelled."
        if self.status == "SHIPPED":
            return False, "Shipped orders cannot be cancelled online. Please contact customer support for return options."

        # Check 24-hour cancellation window from order placement (created_at)
        if self.created_at:
            deadline = self.created_at + timedelta(hours=24)
            if timezone.now() > deadline:
                return False, "Orders can only be cancelled within 24 hours of placement. The cancellation window has expired."

        payment = getattr(self, "payment", None)
        if payment:
            if payment.payment_status == "REFUNDED" or getattr(payment, "refund_status", "") == "COMPLETED":
                return False, "This order has already been refunded."
            if getattr(payment, "refund_status", "") in ("PROCESSING", "PENDING"):
                return False, "A refund is already being processed for this order."

        if self.status in ("PENDING", "PROCESSING"):
            return True, ""

        return False, f"Orders with status '{self.status}' cannot be cancelled."

    @property
    def is_cancellable(self) -> bool:
        can_cancel, _ = self.get_cancellation_eligibility()
        return can_cancel



#OrderItem Model


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField()

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    @property
    def sub_total(self):
        return self.price * self.quantity

    def __str__(self):
        return self.product.name
    


#shipping address model

class ShippingAddress(models.Model):

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="shipping_address"
    )

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)

    address = models.TextField()

    city = models.CharField(max_length=100)

    state = models.CharField(max_length=100)

    postal_code = models.CharField(max_length=10)

    country = models.CharField(max_length=100)
