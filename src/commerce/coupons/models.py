from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class Coupon(models.Model):

    DISCOUNT_TYPE_CHOICES = (
        ("PERCENTAGE", "Percentage"),
        ("FIXED", "Fixed Amount"),
    )

    name = models.CharField(
        max_length=100,
        unique=True
    )

    code = models.CharField(
        max_length=20,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPE_CHOICES
    )

    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    maximum_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True
    )

    usage_limit = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Maximum number of times this coupon can be used."
    )

    valid_from = models.DateTimeField()

    valid_to = models.DateTimeField()

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "coupons"
        ordering = ["-created_at"]
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"

    def __str__(self):
        return self.code

    @property
    def used_count(self):
        return self.usages.count()

    def is_valid(self):

        if not self.is_active:
            return False

        now = timezone.now()

        if now < self.valid_from:
            return False

        if now > self.valid_to:
            return False

        if (
            self.usage_limit is not None and
            self.used_count >= self.usage_limit
        ):
            return False

        return True


class CouponUsage(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="coupon_usages"
    )

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name="usages"
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="coupon_usages"
    )

    order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    applied_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "coupon_usage"
        ordering = ["-applied_at"]
        verbose_name = "Coupon Usage"
        verbose_name_plural = "Coupon Usages"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "coupon", "order"],
                name="unique_coupon_usage"
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.coupon.code}"