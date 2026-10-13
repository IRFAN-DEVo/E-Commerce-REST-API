"""
Stage 5: PostgreSQL E2E and Concurrency Verification Test Suite.
Verifies all 17 E2E business flows and multi-threaded concurrency safety
(overselling protection, duplicate cancellation protection, coupon race protection)
under real PostgreSQL transactions.
"""
import unittest
from decimal import Decimal
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.test import TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import connection, connections
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from products.models import Product, Category, Brand
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem
from payments.models import Payment
from coupons.models import Coupon, CouponUsage
from reviews.models import Review

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
class Stage5PostgreSQLE2EAndConcurrencyTests(TransactionTestCase):
    """
    TransactionTestCase allows testing real transaction commits, rollbacks,
    row-level locks (SELECT FOR UPDATE), and multi-threaded race conditions.
    """

    def setUp(self):
        # Verify database backend is PostgreSQL when running in staging mode
        self.db_vendor = connection.vendor

        # Create Category & Brand
        self.category = Category.objects.create(name="Staging Electronics")
        self.brand = Brand.objects.create(name="Staging Brand")

        # Create Product
        self.product = Product.objects.create(
            name="Staging Flagship Smartphone",
            description="High-end smartphone with OLED display",
            price=Decimal("800.00"),
            stock=10,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )

        # Standard Shipping Address
        self.shipping_address = {
            "full_name": "Jane Staging",
            "phone": "9876543210",
            "address": "456 Staging Avenue",
            "city": "Staging City",
            "state": "CA",
            "postal_code": "90210",
            "country": "USA",
        }

    # =========================================================================
    # STEP 5: COMPREHENSIVE END-TO-END FLOW (ALL 17 FLOWS)
    # =========================================================================

    def test_complete_end_to_end_customer_journey(self):
        """
        Executes the 17 verified customer and admin flows end-to-end.
        """
        client_cust = APIClient()
        client_other = APIClient()
        client_admin = APIClient()

        # 1. Register and log in
        reg_resp = client_cust.post(
            "/api/v1/accounts/register/",
            {
                "name": "Jane Customer",
                "email": "jane_e2e@example.com",
                "phone": "9876543210",
                "password": "SecurePassword123!",
                "confirm_password": "SecurePassword123!",
            },
            format="json",
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)

        login_resp = client_cust.post(
            "/api/v1/accounts/login/",
            {
                "email": "jane_e2e@example.com",
                "password": "SecurePassword123!",
            },
            format="json",
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        access_token = login_resp.data["access"]
        refresh_token = login_resp.data["refresh"]
        client_cust.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Register another customer (for IDOR checks)
        client_other.post(
            "/api/v1/accounts/register/",
            {
                "name": "Bob Other",
                "email": "bob_other@example.com",
                "phone": "9876543211",
                "password": "SecurePassword123!",
                "confirm_password": "SecurePassword123!",
            },
            format="json",
        )
        other_login = client_other.post(
            "/api/v1/accounts/login/",
            {"email": "bob_other@example.com", "password": "SecurePassword123!"},
            format="json",
        )
        client_other.credentials(HTTP_AUTHORIZATION=f"Bearer {other_login.data['access']}")

        # Register / setup admin user
        admin_user = User.objects.create_user(
            username="admin_e2e",
            email="admin_e2e@example.com",
            password="AdminPassword123!",
            first_name="Admin",
            user_type="owner",
        )
        admin_login = client_admin.post(
            "/api/v1/accounts/login/",
            {"email": "admin_e2e@example.com", "password": "AdminPassword123!"},
            format="json",
        )
        client_admin.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.data['access']}")

        # 2. Browse and search products
        search_resp = client_cust.get("/api/v1/products/products/?search=Smartphone")
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(search_resp.data["total_products"], 1)

        # 3. Add product to cart
        add_cart_resp = client_cust.post(
            "/api/v1/cart/cart/items/",
            {"product": self.product.id, "quantity": 2},
            format="json",
        )
        self.assertEqual(add_cart_resp.status_code, status.HTTP_201_CREATED)
        cart_item_id = add_cart_resp.data["id"]

        # 4. Update quantity
        update_cart_resp = client_cust.patch(
            f"/api/v1/cart/cart/items/{cart_item_id}/",
            {"quantity": 3},
            format="json",
        )
        self.assertEqual(update_cart_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_cart_resp.data["quantity"], 3)

        # 5. Reject quantity above available stock (Stock is 10)
        reject_stock_resp = client_cust.patch(
            f"/api/v1/cart/cart/items/{cart_item_id}/",
            {"quantity": 50},
            format="json",
        )
        self.assertEqual(reject_stock_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 6 & 7. Coupons: Create coupon, test invalid coupon, and apply valid coupon
        coupon = Coupon.objects.create(
            name="E2E_DISCOUNT",
            code="E2E10",
            discount_type="PERCENTAGE",
            discount_value=Decimal("10.00"),
            minimum_order_amount=Decimal("100.00"),
            valid_from="2020-01-01T00:00:00Z",
            valid_to="2035-12-31T23:59:59Z",
            is_active=True,
        )

        # 8. Complete COD checkout (Order for 3 smartphones @ 800.00 = 2400.00)
        checkout_resp = client_cust.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": self.shipping_address},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        order_id = checkout_resp.data["id"]
        self.assertEqual(Decimal(str(checkout_resp.data["total_price"])), Decimal("2400.00"))

        # 9. Verify stock deduction (10 - 3 = 7)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)

        # 7. Reject invalid coupon
        bad_coupon_resp = client_cust.post(
            f"/api/v1/coupons/coupons/apply/{order_id}/",
            {"code": "NONEXISTENT"},
            format="json",
        )
        self.assertEqual(bad_coupon_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 6. Apply valid coupon (10% of 2400 = 240 discount -> 2160.00)
        valid_coupon_resp = client_cust.post(
            f"/api/v1/coupons/coupons/apply/{order_id}/",
            {"code": "E2E10"},
            format="json",
        )
        self.assertEqual(valid_coupon_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(valid_coupon_resp.data["discount"])), Decimal("240.00"))
        self.assertEqual(Decimal(str(valid_coupon_resp.data["final_total"])), Decimal("2160.00"))

        # Create COD payment for the order
        pay_resp = client_cust.post(
            f"/api/v1/payments/orders/{order_id}/payments/",
            {"payment_method": "COD"},
            format="json",
        )
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED)
        payment_id = pay_resp.data["id"]

        # 10. View order history and order details
        orders_resp = client_cust.get("/api/v1/orders/orders/")
        self.assertEqual(orders_resp.status_code, status.HTTP_200_OK)
        order_detail_resp = client_cust.get(f"/api/v1/orders/orders/{order_id}/")
        self.assertEqual(order_detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(order_detail_resp.data["id"], order_id)

        # 15. Verify users cannot access or cancel other customers' orders (IDOR)
        idor_get_resp = client_other.get(f"/api/v1/orders/orders/{order_id}/")
        self.assertEqual(idor_get_resp.status_code, status.HTTP_404_NOT_FOUND)

        idor_cancel_resp = client_other.patch(f"/api/v1/orders/orders/{order_id}/cancel/")
        self.assertEqual(idor_cancel_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 16. Verify administrative operations require the correct permissions
        non_admin_order_list = client_cust.get("/api/v1/orders/admin/orders/")
        self.assertEqual(non_admin_order_list.status_code, status.HTTP_403_FORBIDDEN)

        admin_order_list = client_admin.get("/api/v1/orders/admin/orders/")
        self.assertEqual(admin_order_list.status_code, status.HTTP_200_OK)

        # 11. Cancel an eligible pending, unpaid order
        cancel_resp = client_cust.patch(f"/api/v1/orders/orders/{order_id}/cancel/")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)

        # 12. Verify stock restoration occurs exactly once (7 + 3 = 10)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

        # 13. Verify coupon usage is released correctly
        self.assertEqual(CouponUsage.objects.filter(order_id=order_id).count(), 0)

        # 14. Verify cancelled orders cannot receive an invalid successful payment transition
        invalid_pay_update = client_admin.patch(
            f"/api/v1/payments/admin/payments/{payment_id}/status/",
            {"payment_status": "SUCCESS"},
            format="json",
        )
        self.assertEqual(invalid_pay_update.status_code, status.HTTP_400_BAD_REQUEST)

        # 17. Verify logout and expired-token behavior
        logout_resp = client_cust.post(
            "/api/v1/accounts/logout/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Attempting to use the blacklisted refresh token to refresh access token
        refresh_attempt = client_cust.post(
            "/api/v1/accounts/token/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(refresh_attempt.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================================
    # STEP 6: REAL MULTI-THREADED CONCURRENCY TESTS UNDER POSTGRESQL TRANSACTIONS
    # =========================================================================

    @unittest.skipIf(connection.vendor == "sqlite", "PostgreSQL-specific: multi-threaded concurrency requires row-level locking. SQLite locks entire tables.")
    def test_concurrent_checkouts_prevent_overselling(self):
        """
        Setup: Stock is exactly 3 items.
        10 concurrent customer threads each attempt to checkout 1 item simultaneously.
        Verification:
        - Exactly 3 orders succeed.
        - Exactly 7 orders fail with validation error.
        - Stock ends at exactly 0 (never negative).
        """
        self.product.stock = 3
        self.product.save(update_fields=["stock"])

        num_threads = 10
        customers = []
        clients = []

        # Pre-create 10 distinct customer accounts and populate carts
        for i in range(num_threads):
            user = User.objects.create_user(
                username=f"race_cust_{i}",
                email=f"race_cust_{i}@example.com",
                password="RacePassword123!",
                user_type="customer",
            )
            customers.append(user)
            client = APIClient()
            client.force_authenticate(user=user)
            clients.append(client)

            cart = Cart.objects.create(user=user)
            CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        results = []
        barrier = threading.Barrier(num_threads)

        def attempt_checkout(client_index):
            client = clients[client_index]
            # Wait for all threads to be ready so they hit checkout at the exact same moment
            barrier.wait()
            resp = client.post(
                "/api/v1/orders/checkout/",
                {"shipping_address": self.shipping_address},
                format="json",
            )
            # Close connections for this thread to release connection back to pool
            connections.close_all()
            return resp.status_code

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(attempt_checkout, i) for i in range(num_threads)]
            for future in as_completed(futures):
                results.append(future.result())

        connections.close_all()

        success_count = results.count(status.HTTP_201_CREATED)
        fail_count = results.count(status.HTTP_400_BAD_REQUEST)

        self.assertEqual(success_count, 3, f"Expected exactly 3 checkouts to succeed, got {success_count}. Results: {results}")
        self.assertEqual(fail_count, 7, f"Expected exactly 7 checkouts to be rejected, got {fail_count}. Results: {results}")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0, f"Stock should be exactly 0, got {self.product.stock}")

    @unittest.skipIf(connection.vendor == "sqlite", "PostgreSQL-specific: multi-threaded concurrency requires row-level locking. SQLite locks entire tables.")
    def test_concurrent_order_cancellations_restore_stock_exactly_once(self):
        """
        Setup: Order with 5 items. Initial stock is 5.
        5 concurrent threads attempt to cancel the exact same order simultaneously.
        Verification:
        - Exactly 1 cancellation succeeds (HTTP 200).
        - Exactly 4 cancellations fail (HTTP 400).
        - Product stock is restored from 5 to 10 (restored exactly once, never multiplied).
        """
        self.product.stock = 5
        self.product.save(update_fields=["stock"])

        customer = User.objects.create_user(
            username="cancel_racer",
            email="cancel_racer@example.com",
            password="CancelPass123!",
            user_type="customer",
        )
        order = Order.objects.create(
            user=customer,
            status="PENDING",
            total_price=Decimal("4000.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=5,
            price=self.product.price,
        )

        num_threads = 5
        barrier = threading.Barrier(num_threads)
        results = []

        def attempt_cancellation():
            client = APIClient()
            client.force_authenticate(user=customer)
            barrier.wait()
            resp = client.patch(f"/api/v1/orders/orders/{order.id}/cancel/")
            connections.close_all()
            return resp.status_code

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(attempt_cancellation) for _ in range(num_threads)]
            for future in as_completed(futures):
                results.append(future.result())

        connections.close_all()

        success_count = results.count(status.HTTP_200_OK)
        fail_count = results.count(status.HTTP_400_BAD_REQUEST)

        self.assertEqual(success_count, 1, f"Expected exactly 1 cancellation to succeed, got {success_count}. Results: {results}")
        self.assertEqual(fail_count, 4, f"Expected 4 cancellations to fail, got {fail_count}. Results: {results}")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10, f"Expected stock to restore to 10, got {self.product.stock}")

    @unittest.skipIf(connection.vendor == "sqlite", "PostgreSQL-specific: multi-threaded concurrency requires row-level locking. SQLite locks entire tables.")
    def test_concurrent_coupon_redemptions_respect_limits(self):
        """
        Setup: A single-use coupon (usage_limit=1).
        5 concurrent threads attempt to redeem the coupon on 5 different orders.
        Verification:
        - Exactly 1 coupon redemption succeeds.
        - Exactly 4 redemptions fail.
        - CouponUsage count is exactly 1.
        """
        coupon = Coupon.objects.create(
            name="RACE_COUPON",
            code="ONEOFF",
            discount_type="FIXED",
            discount_value=Decimal("50.00"),
            minimum_order_amount=Decimal("100.00"),
            usage_limit=1,
            valid_from="2020-01-01T00:00:00Z",
            valid_to="2035-12-31T23:59:59Z",
            is_active=True,
        )

        num_threads = 5
        orders = []
        clients = []

        for i in range(num_threads):
            user = User.objects.create_user(
                username=f"coupon_racer_{i}",
                email=f"coupon_racer_{i}@example.com",
                password="CouponPass123!",
                user_type="customer",
            )
            order = Order.objects.create(
                user=user,
                status="PENDING",
                total_price=Decimal("500.00"),
            )
            orders.append(order)
            client = APIClient()
            client.force_authenticate(user=user)
            clients.append(client)

        barrier = threading.Barrier(num_threads)
        results = []

        def attempt_apply(index):
            client = clients[index]
            order = orders[index]
            barrier.wait()
            resp = client.post(
                f"/api/v1/coupons/coupons/apply/{order.id}/",
                {"code": "ONEOFF"},
                format="json",
            )
            connections.close_all()
            return resp.status_code

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(attempt_apply, i) for i in range(num_threads)]
            for future in as_completed(futures):
                results.append(future.result())

        connections.close_all()

        success_count = results.count(status.HTTP_200_OK)
        fail_count = results.count(status.HTTP_400_BAD_REQUEST)

        self.assertEqual(success_count, 1, f"Expected exactly 1 coupon redemption, got {success_count}. Results: {results}")
        self.assertEqual(fail_count, 4, f"Expected 4 coupon redemptions to fail, got {fail_count}. Results: {results}")
        self.assertEqual(CouponUsage.objects.filter(coupon=coupon).count(), 1)
