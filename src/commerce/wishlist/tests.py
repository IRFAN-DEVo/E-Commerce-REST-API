from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from products.models import Product, Category, Brand
from wishlist.models import Wishlist

User = get_user_model()


class WishlistSecurityTests(APITestCase):
    def setUp(self):
        # Create categories and brands
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="BrandX")

        # Create active products
        self.product1 = Product.objects.create(
            name="Laptop",
            sku="SKU-LAPTOP-1",
            price=999.99,
            stock=10,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )
        self.product2 = Product.objects.create(
            name="Phone",
            sku="SKU-PHONE-2",
            price=499.99,
            stock=5,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )
        self.unavailable_product = Product.objects.create(
            name="Discontinued Item",
            sku="SKU-DISC-3",
            price=199.99,
            stock=0,
            is_available=False,
            category=self.category,
            brand=self.brand,
        )

        # Create two distinct test users
        self.user_a = User.objects.create_user(
            username="user_a",
            email="usera@example.com",
            password="Password123!",
            first_name="User A",
            is_active=True,
            is_email_verified=True,
            is_profile_complete=True,
        )
        self.user_b = User.objects.create_user(
            username="user_b",
            email="userb@example.com",
            password="Password123!",
            first_name="User B",
            is_active=True,
            is_email_verified=True,
            is_profile_complete=True,
        )

        self.list_url = reverse("wishlist-list")
        self.add_url = reverse("wishlist-add")

    def test_guest_cannot_view_wishlist(self):
        """Unauthenticated guest receives 401 when attempting to view wishlist."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_guest_cannot_add_to_wishlist(self):
        """Unauthenticated guest receives 401 when attempting to add to wishlist."""
        response = self.client.post(self.add_url, {"product": self.product1.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Wishlist.objects.filter(product=self.product1).exists())

    def test_guest_cannot_remove_from_wishlist(self):
        """Unauthenticated guest receives 401 when attempting to delete wishlist item."""
        # Create an entry as User A
        item = Wishlist.objects.create(user=self.user_a, product=self.product1)
        delete_url = reverse("wishlist-delete", kwargs={"pk": item.id})

        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Wishlist.objects.filter(id=item.id).exists())

    def test_guest_cannot_check_wishlist_status(self):
        """Unauthenticated guest receives 401 when checking wishlist status."""
        check_url = reverse("wishlist-check", kwargs={"product_id": self.product1.id})
        response = self.client.get(check_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_add_product(self):
        """Authenticated user can add a valid available product to their personal wishlist."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.add_url, {"product": self.product1.id})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Wishlist.objects.filter(user=self.user_a, product=self.product1).exists())

    def test_duplicate_wishlist_entry_prevented(self):
        """Adding the same product twice returns 400 validation error."""
        Wishlist.objects.create(user=self.user_a, product=self.product1)
        self.client.force_authenticate(user=self.user_a)

        response = self.client.post(self.add_url, {"product": self.product1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Wishlist.objects.filter(user=self.user_a, product=self.product1).count(), 1)

    def test_cannot_add_unavailable_product(self):
        """Adding an unavailable product returns 400 validation error."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.add_url, {"product": self.unavailable_product.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unavailable", str(response.data))

    def test_user_a_cannot_view_user_b_wishlist(self):
        """User A sees only their own wishlist items, never User B's items."""
        Wishlist.objects.create(user=self.user_a, product=self.product1)
        Wishlist.objects.create(user=self.user_b, product=self.product2)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        returned_products = [item["product"]["id"] for item in results]
        self.assertIn(self.product1.id, returned_products)
        self.assertNotIn(self.product2.id, returned_products)

    def test_user_a_cannot_delete_user_b_wishlist_entry(self):
        """User A attempting to delete User B's wishlist entry receives 404."""
        item_b = Wishlist.objects.create(user=self.user_b, product=self.product2)
        delete_url = reverse("wishlist-delete", kwargs={"pk": item_b.id})

        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Wishlist.objects.filter(id=item_b.id).exists())

    def test_authenticated_user_can_remove_own_wishlist_entry_by_id_or_product_id(self):
        """User A can remove an item either by wishlist entry ID or by product ID."""
        item1 = Wishlist.objects.create(user=self.user_a, product=self.product1)
        item2 = Wishlist.objects.create(user=self.user_a, product=self.product2)

        self.client.force_authenticate(user=self.user_a)

        # Remove item1 by wishlist PK
        del1_url = reverse("wishlist-delete", kwargs={"pk": item1.id})
        resp1 = self.client.delete(del1_url)
        self.assertEqual(resp1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Wishlist.objects.filter(id=item1.id).exists())

        # Remove item2 by product ID
        del2_url = reverse("wishlist-delete", kwargs={"pk": self.product2.id})
        resp2 = self.client.delete(del2_url)
        self.assertEqual(resp2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Wishlist.objects.filter(id=item2.id).exists())

    def test_check_wishlist_status(self):
        """Check endpoint correctly returns wishlisted status for current user."""
        item = Wishlist.objects.create(user=self.user_a, product=self.product1)
        self.client.force_authenticate(user=self.user_a)

        check_url1 = reverse("wishlist-check", kwargs={"product_id": self.product1.id})
        resp1 = self.client.get(check_url1)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertTrue(resp1.data["is_wishlisted"])
        self.assertEqual(resp1.data["wishlist_id"], item.id)

        check_url2 = reverse("wishlist-check", kwargs={"product_id": self.product2.id})
        resp2 = self.client.get(check_url2)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertFalse(resp2.data["is_wishlisted"])
        self.assertIsNone(resp2.data["wishlist_id"])

    def test_invalid_product_id_rejected(self):
        """Non-existent product ID returns 400 error."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.add_url, {"product": 999999})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
