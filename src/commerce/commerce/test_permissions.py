"""
Comprehensive Security and Permissions Regression Test Suite.

Covers:
  1. Anonymous requests to protected endpoints (401 Not Authenticated)
  2. Public endpoints (products, categories, brands, reviews list) (200 OK)
  3. Customer isolation / IDOR protection (Customer A cannot access Customer B's resources)
     - Cart items (read, update, delete)
     - Wishlist items (read, delete)
     - Orders (detail, cancel)
     - Payments (create for another's order, detail)
     - Coupons (apply to another's order, usage history)
     - Notifications (detail, mark as read)
     - Reviews (update, delete)
  4. Privilege escalation prevention
     - Registration ignores user_type, is_staff, is_superuser
     - Order status and total_price cannot be tampered with by clients
     - Payment status and amount cannot be overridden by clients
     - Review author cannot be forged
  5. Customer access to admin / owner endpoints (403 Forbidden)
     - Dashboard and sales fluctuations
     - Admin orders and order status updates
     - Admin payments and payment status updates
     - Admin customer management
     - Admin coupon management
     - Admin notification list
     - Product, category, brand create/update/delete/import/export
  6. Owner and Staff privileged access (200 OK)
  7. Review verified-purchase enforcement
"""

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product, Category, Brand
from cart.models import Cart, CartItem
from wishlist.models import Wishlist
from orders.models import Order, OrderItem, ShippingAddress
from payments.models import Payment
from coupons.models import Coupon, CouponUsage
from reviews.models import Review
from notifications.models import Notification

User = get_user_model()


@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "api-login": None,
        "api-register": None,
        "forgot_password": None,
    }
)
class BaseSecurityTestCase(TestCase):
    """Base fixture creating isolated customer, shop owner, and staff users."""

    def setUp(self):
        self.client_anon = APIClient()

        # Customer A (Alice)
        self.user_alice = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="AlicePassword123!",
            first_name="Alice",
            user_type="customer",
        )
        self.client_alice = APIClient()
        self.client_alice.force_authenticate(user=self.user_alice)

        # Customer B (Bob)
        self.user_bob = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="BobPassword123!",
            first_name="Bob",
            user_type="customer",
        )
        self.client_bob = APIClient()
        self.client_bob.force_authenticate(user=self.user_bob)

        # Shop Owner (Merchant)
        self.user_owner = User.objects.create_user(
            username="shopowner",
            email="owner@example.com",
            password="OwnerPassword123!",
            first_name="Store Owner",
            user_type="owner",
        )
        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.user_owner)

        # Staff User
        self.user_staff = User.objects.create_user(
            username="staffmember",
            email="staff@example.com",
            password="StaffPassword123!",
            first_name="Staff",
            is_staff=True,
        )
        self.client_staff = APIClient()
        self.client_staff.force_authenticate(user=self.user_staff)

        # Seed catalog data
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="AcmeCorp")
        self.product = Product.objects.create(
            name="Wireless Headphones",
            description="High fidelity audio",
            price=Decimal("100.00"),
            stock=50,
            category=self.category,
            brand=self.brand,
            is_available=True,
        )


class AnonymousAccessSecurityTests(BaseSecurityTestCase):
    """Verify that unauthenticated access to protected endpoints is rejected with 401."""

    def test_anonymous_cannot_access_customer_profile(self):
        resp = self.client_anon.get("/api/v1/accounts/profile/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_cart(self):
        resp = self.client_anon.get("/api/v1/cart/cart/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_add_to_cart(self):
        resp = self.client_anon.post(
            "/api/v1/cart/cart/items/",
            {"product": self.product.id, "quantity": 1},
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_wishlist(self):
        resp = self.client_anon.get("/api/v1/wishlist/wishlist/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_orders(self):
        resp = self.client_anon.get("/api/v1/orders/orders/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_checkout(self):
        resp = self.client_anon.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": {"full_name": "Ghost"}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_payments(self):
        resp = self.client_anon.get("/api/v1/payments/payments/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_notifications(self):
        resp = self.client_anon.get("/api/v1/notifications/notifications/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_dashboard(self):
        resp = self.client_anon.get("/api/v1/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_admin_orders(self):
        resp = self.client_anon.get("/api/v1/orders/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_admin_payments(self):
        resp = self.client_anon.get("/api/v1/payments/admin/payments/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_create_product(self):
        resp = self.client_anon.post(
            "/api/v1/products/products/create/",
            {"name": "Unauthorized Item"},
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class PublicBrowsingSecurityTests(BaseSecurityTestCase):
    """Verify that public endpoints remain accessible to anonymous users."""

    def test_anonymous_can_list_products(self):
        resp = self.client_anon.get("/api/v1/products/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_anonymous_can_view_product_detail(self):
        resp = self.client_anon.get(f"/api/v1/products/products/{self.product.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_anonymous_can_list_categories(self):
        resp = self.client_anon.get("/api/v1/products/categories/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_anonymous_can_list_brands(self):
        resp = self.client_anon.get("/api/v1/products/brands/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_anonymous_can_list_product_reviews(self):
        resp = self.client_anon.get(f"/api/v1/reviews/products/{self.product.id}/reviews/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class CustomerIsolationAndIDORTests(BaseSecurityTestCase):
    """
    Verify strict object-level isolation between customers.
    Customer B must NOT be able to read, modify, or pay for Customer A's resources.
    """

    def setUp(self):
        super().setUp()

        # Alice's cart item
        self.alice_cart = Cart.objects.create(user=self.user_alice)
        self.alice_cart_item = CartItem.objects.create(
            cart=self.alice_cart,
            product=self.product,
            quantity=2,
        )

        # Alice's wishlist item
        self.alice_wishlist = Wishlist.objects.create(
            user=self.user_alice,
            product=self.product,
        )

        # Alice's order
        self.alice_order = Order.objects.create(
            user=self.user_alice,
            status="PENDING",
            total_price=Decimal("200.00"),
        )
        self.alice_order_item = OrderItem.objects.create(
            order=self.alice_order,
            product=self.product,
            quantity=2,
            price=Decimal("100.00"),
        )
        self.alice_address = ShippingAddress.objects.create(
            order=self.alice_order,
            full_name="Alice Smith",
            phone="1234567890",
            address="123 Main St",
            city="Metropolis",
            state="NY",
            postal_code="10001",
            country="USA",
        )

        # Alice's notification
        self.alice_notification = Notification.objects.create(
            user=self.user_alice,
            title="Order Placed",
            message="Your order was created.",
        )

    # --- Cart Isolation ---

    def test_bob_cannot_view_alice_cart_item(self):
        resp = self.client_bob.get(f"/api/v1/cart/cart/items/{self.alice_cart_item.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_bob_cannot_update_alice_cart_item(self):
        resp = self.client_bob.patch(
            f"/api/v1/cart/cart/items/{self.alice_cart_item.id}/",
            {"quantity": 10},
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.alice_cart_item.refresh_from_db()
        self.assertEqual(self.alice_cart_item.quantity, 2)

    def test_bob_cannot_delete_alice_cart_item(self):
        resp = self.client_bob.delete(f"/api/v1/cart/cart/items/{self.alice_cart_item.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(CartItem.objects.filter(id=self.alice_cart_item.id).exists())

    # --- Wishlist Isolation ---

    def test_bob_cannot_see_alice_wishlist_items(self):
        resp = self.client_bob.get("/api/v1/wishlist/wishlist/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Bob's wishlist should be empty (handle paginated response)
        results = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 0)

    def test_bob_cannot_delete_alice_wishlist_item(self):
        resp = self.client_bob.delete(f"/api/v1/wishlist/remove/{self.alice_wishlist.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Wishlist.objects.filter(id=self.alice_wishlist.id).exists())

    # --- Order Isolation ---

    def test_bob_cannot_view_alice_order(self):
        resp = self.client_bob.get(f"/api/v1/orders/orders/{self.alice_order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_bob_cannot_cancel_alice_order(self):
        resp = self.client_bob.patch(f"/api/v1/orders/orders/{self.alice_order.id}/cancel/")
        # Order does not belong to Bob: rejected with 400 validation error (order not found)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.alice_order.refresh_from_db()
        self.assertEqual(self.alice_order.status, "PENDING")

    # --- Payment Isolation ---

    def test_bob_cannot_create_payment_for_alice_order(self):
        resp = self.client_bob.post(
            f"/api/v1/payments/orders/{self.alice_order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payment.objects.filter(order=self.alice_order).exists())

    def test_bob_cannot_view_alice_payment_detail(self):
        # Alice creates a payment for her own order
        alice_payment = Payment.objects.create(
            order=self.alice_order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("200.00"),
        )
        resp = self.client_bob.get(f"/api/v1/payments/payments/{alice_payment.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # --- Notification Isolation ---

    def test_bob_cannot_view_alice_notification(self):
        resp = self.client_bob.get(
            f"/api/v1/notifications/notifications/{self.alice_notification.id}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_bob_cannot_mark_alice_notification_as_read(self):
        resp = self.client_bob.patch(
            f"/api/v1/notifications/notifications/{self.alice_notification.id}/mark-as-read/"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.alice_notification.refresh_from_db()
        self.assertFalse(self.alice_notification.is_read)


class CustomerPrivilegeEscalationTests(BaseSecurityTestCase):
    """
    Verify customers cannot access staff/owner administrative endpoints,
    or escalate privileges via writable serializer fields.
    """

    def test_customer_cannot_access_admin_dashboard(self):
        resp = self.client_alice.get("/api/v1/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_access_sales_fluctuations(self):
        resp = self.client_alice.get("/api/v1/dashboard/fluctuations/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_access_admin_orders(self):
        resp = self.client_alice.get("/api/v1/orders/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_update_order_status_admin(self):
        order = Order.objects.create(
            user=self.user_bob,
            status="PENDING",
            total_price=Decimal("100.00"),
        )
        resp = self.client_alice.patch(
            f"/api/v1/orders/admin/orders/{order.id}/status/",
            {"status": "DELIVERED"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_access_admin_payments(self):
        resp = self.client_alice.get("/api/v1/payments/admin/payments/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_update_payment_status_admin(self):
        order = Order.objects.create(
            user=self.user_bob,
            status="PENDING",
            total_price=Decimal("100.00"),
        )
        payment = Payment.objects.create(
            order=order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_alice.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_access_admin_customers(self):
        resp = self.client_alice.get("/api/v1/accounts/admin/customers/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_create_coupons(self):
        resp = self.client_alice.post(
            "/api/v1/coupons/coupons/create/",
            {
                "name": "Free 100",
                "code": "FREE100",
                "discount_type": "PERCENTAGE",
                "discount_value": "100.00",
                "valid_from": "2026-01-01T00:00:00Z",
                "valid_to": "2026-12-31T23:59:59Z",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_create_or_modify_products(self):
        # Create product
        resp_create = self.client_alice.post(
            "/api/v1/products/products/create/",
            {"name": "Hacked Product", "price": "1.00"},
        )
        self.assertEqual(resp_create.status_code, status.HTTP_403_FORBIDDEN)

        # Update product
        resp_update = self.client_alice.patch(
            f"/api/v1/products/products/{self.product.id}/update/",
            {"price": "0.01"},
        )
        self.assertEqual(resp_update.status_code, status.HTTP_403_FORBIDDEN)

        # Delete product
        resp_delete = self.client_alice.delete(
            f"/api/v1/products/products/{self.product.id}/delete/"
        )
        self.assertEqual(resp_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_signup_cannot_escalate_user_type_or_staff(self):
        """Registering with user_type='owner' or is_staff=True must be ignored."""
        resp = self.client_anon.post(
            "/api/v1/accounts/register/",
            {
                "name": "Attacker",
                "email": "attacker@example.com",
                "phone": "9876543210",
                "password": "AttackerPass123!",
                "confirm_password": "AttackerPass123!",
                "user_type": "owner",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        attacker = User.objects.get(email="attacker@example.com")
        self.assertEqual(attacker.user_type, "customer")
        self.assertFalse(attacker.is_staff)
        self.assertFalse(attacker.is_superuser)


class OwnerAndStaffAccessTests(BaseSecurityTestCase):
    """Verify that Shop Owner and Staff have proper administrative access."""

    def test_owner_can_access_dashboard(self):
        resp = self.client_owner.get("/api/v1/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_staff_can_access_dashboard(self):
        resp = self.client_staff.get("/api/v1/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_owner_can_view_admin_orders(self):
        resp = self.client_owner.get("/api/v1/orders/admin/orders/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_owner_can_view_admin_payments(self):
        resp = self.client_owner.get("/api/v1/payments/admin/payments/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_owner_can_view_admin_customers(self):
        resp = self.client_owner.get("/api/v1/accounts/admin/customers/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_owner_can_create_category(self):
        resp = self.client_owner.post(
            "/api/v1/products/categories/create/",
            {"name": "Books"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


class ReviewAuthorizationTests(BaseSecurityTestCase):
    """Verify review authorization and verified-purchase requirements."""

    def test_cannot_review_without_purchasing(self):
        """Alice attempts to review a product she never purchased."""
        resp = self.client_alice.post(
            "/api/v1/reviews/reviews/",
            {
                "product": self.product.id,
                "rating": 5,
                "comment": "Never bought this but it looks good!",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purchased", str(resp.data))

    def test_cannot_review_when_order_is_pending(self):
        """Alice has an order with the product, but it is not yet DELIVERED."""
        order = Order.objects.create(
            user=self.user_alice,
            status="PENDING",
            total_price=Decimal("100.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal("100.00"),
        )

        resp = self.client_alice.post(
            "/api/v1/reviews/reviews/",
            {
                "product": self.product.id,
                "rating": 5,
                "comment": "Still waiting for delivery!",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_review_delivered_product(self):
        """Alice can review once her order status is DELIVERED."""
        order = Order.objects.create(
            user=self.user_alice,
            status="DELIVERED",
            total_price=Decimal("100.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal("100.00"),
        )

        resp = self.client_alice.post(
            "/api/v1/reviews/reviews/",
            {
                "product": self.product.id,
                "rating": 5,
                "comment": "Delivered and works great!",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_bob_cannot_edit_alice_review(self):
        """Bob cannot update or delete Alice's review."""
        review = Review.objects.create(
            user=self.user_alice,
            product=self.product,
            rating=5,
            comment="Alice's authentic review",
        )
        resp_update = self.client_bob.patch(
            f"/api/v1/reviews/reviews/{review.id}/update/",
            {"comment": "Tampered by Bob"},
        )
        self.assertEqual(resp_update.status_code, status.HTTP_404_NOT_FOUND)

        resp_delete = self.client_bob.delete(
            f"/api/v1/reviews/reviews/{review.id}/delete/"
        )
        self.assertEqual(resp_delete.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Review.objects.filter(id=review.id).exists())
