from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Brand, Category, Product
from cart.models import Cart, CartItem

User = get_user_model()


class ProductVariationCategoryTests(TestCase):
    """
    Test suite verifying category-specific clothing variation behavior (Color & Size).
    Ensures clothing/dress products enable variations, while electronics/computers/accessories
    and products without categories reject or disable clothing variations.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="variation_shopper",
            email="shopper@djangomart.com",
            password="StrongPassword123!",
        )
        self.client.force_authenticate(user=self.user)

        self.brand = Brand.objects.create(name="Apex")

        # Categories
        self.cat_dress = Category.objects.create(name="Dress")
        self.cat_women_clothing = Category.objects.create(name="Women Clothing")
        self.cat_men_clothing = Category.objects.create(name="Men Clothing")
        self.cat_computers = Category.objects.create(name="Computers")
        self.cat_electronics = Category.objects.create(name="Electronics")
        self.cat_accessories = Category.objects.create(name="Accessories")
        self.cat_appliances = Category.objects.create(name="Home Appliances")

        # Products
        self.dress_product = Product.objects.create(
            name="Women's Casual Floral Dress",
            price=Decimal("1499.00"),
            stock=20,
            category=self.cat_dress,
            brand=self.brand,
            is_available=True,
        )

        self.clothing_product = Product.objects.create(
            name="Men's Classic Slim Fit Shirt",
            price=Decimal("999.00"),
            stock=30,
            category=self.cat_men_clothing,
            brand=self.brand,
            is_available=True,
        )

        self.monitor_product = Product.objects.create(
            name="Monitor 27-inch 4K IPS",
            price=Decimal("24999.00"),
            stock=10,
            category=self.cat_computers,
            brand=self.brand,
            is_available=True,
        )

        self.headphones_product = Product.objects.create(
            name="Wireless Noise Cancelling Headphones",
            price=Decimal("4999.00"),
            stock=15,
            category=self.cat_electronics,
            brand=self.brand,
            is_available=True,
        )

        self.belt_product = Product.objects.create(
            name="Leather Belt",
            price=Decimal("499.00"),
            stock=25,
            category=self.cat_accessories,
            brand=self.brand,
            is_available=True,
        )

    # 1. Dress product has_clothing_variations is True
    def test_dress_product_has_clothing_variations(self):
        self.assertTrue(self.dress_product.has_clothing_variations)
        url = reverse("product-detail", kwargs={"pk": self.dress_product.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_clothing_variations"])
        self.assertEqual(resp.data["category"]["slug"], "dress")

    # 2. Clothing product has_clothing_variations is True
    def test_clothing_product_has_clothing_variations(self):
        self.assertTrue(self.clothing_product.has_clothing_variations)
        url = reverse("product-detail", kwargs={"pk": self.clothing_product.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["has_clothing_variations"])

    # 3. Monitor product has_clothing_variations is False
    def test_monitor_product_hides_clothing_variations(self):
        self.assertFalse(self.monitor_product.has_clothing_variations)
        url = reverse("product-detail", kwargs={"pk": self.monitor_product.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_clothing_variations"])
        self.assertEqual(resp.data["category"]["slug"], "computers")

    # 4. Electronics product has_clothing_variations is False
    def test_electronics_product_hides_clothing_variations(self):
        self.assertFalse(self.headphones_product.has_clothing_variations)
        url = reverse("product-detail", kwargs={"pk": self.headphones_product.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_clothing_variations"])

    # 5. Accessories product has_clothing_variations is False
    def test_accessories_product_hides_clothing_variations(self):
        self.assertFalse(self.belt_product.has_clothing_variations)
        url = reverse("product-detail", kwargs={"pk": self.belt_product.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["has_clothing_variations"])

    # 6. Non-clothing product: Add to Cart works without clothing variations
    def test_non_clothing_add_to_cart_works_without_variations(self):
        resp = self.client.post("/api/v1/cart/cart/items/", {
            "product": self.monitor_product.id,
            "quantity": 1,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        cart = Cart.objects.get(user=self.user)
        self.assertTrue(CartItem.objects.filter(cart=cart, product=self.monitor_product).exists())

    # 7. Clothing product: Add to Cart works with valid variations
    def test_clothing_add_to_cart_works_with_variations(self):
        resp = self.client.post("/api/v1/cart/cart/items/", {
            "product": self.dress_product.id,
            "quantity": 1,
            "color": "black",
            "size": "M",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        cart = Cart.objects.get(user=self.user)
        self.assertTrue(CartItem.objects.filter(cart=cart, product=self.dress_product).exists())

    # 8. Backend rejects unsupported clothing variations for non-clothing products
    def test_backend_rejects_unsupported_clothing_variations_for_non_clothing(self):
        resp = self.client.post("/api/v1/cart/cart/items/", {
            "product": self.monitor_product.id,
            "quantity": 1,
            "color": "black",
            "size": "L",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("variations", resp.data)
        self.assertIn("does not support clothing variations", str(resp.data["variations"]))

    # 9. Products without a category do not incorrectly display clothing variations
    def test_product_without_category_has_no_clothing_variations(self):
        dummy_prod = Product(name="Uncategorized Gadget", price=Decimal("100.00"), stock=5)
        self.assertFalse(dummy_prod.has_clothing_variations)
