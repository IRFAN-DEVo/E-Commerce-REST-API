from django.db import models
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

    def get_cancellation_eligibility(self) -> tuple[bool, str]:
        """
        Evaluates server-side business rules to determine if the order is eligible
        for self-service customer cancellation. Returns (is_cancellable, reason_if_not).
        """
        if self.status == "CANCELLED":
            return False, "This order is already cancelled."
        if self.status == "DELIVERED":
            return False, "Delivered orders cannot be cancelled."
        if self.status == "SHIPPED":
            return False, "Shipped orders cannot be cancelled online. Please contact customer support for return options."

        payment = getattr(self, "payment", None)
        if payment:
            if payment.payment_status == "REFUNDED":
                return False, "This order has already been refunded."
            if payment.payment_status == "SUCCESS":
                return False, "Paid orders cannot be cancelled directly. Please contact support for refund and return assistance."

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