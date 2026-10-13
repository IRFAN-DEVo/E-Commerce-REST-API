from django.db import models
from products.models import Product

from accounts.models import User
from django.core.validators import MinValueValidator

# Create your models here.


class Cart(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cart'
        )
    created_at = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'cart'
        ordering = ['created_at']

    def __str__(self):
        return f"Cart for {self.user.username}"

    
class CartItem(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE,related_name='cart_items')
    quantity = models.IntegerField(validators=[MinValueValidator(1)], default=1)

    class Meta:
        db_table = "cartitem"
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_cart_product"
            )
        ]

    @property
    def sub_total(self):
        return self.product.price * self.quantity

    def __str__(self):
        return self.product.name