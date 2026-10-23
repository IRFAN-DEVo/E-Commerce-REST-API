"""
Payment Security and Checkout Integrity Regression Test Suite.

Covers:
  Task 1 — Payment security:
    1. Payment state machine: only allowed transitions succeed
    2. Customers cannot forge payment status via customer-facing endpoints
    3. Admin payment status update syncs order status (PENDING -> PROCESSING)
    4. Cancelling paid orders is rejected
    5. Cancelling unpaid orders restores stock
    6. Payment amount matches order total (server-computed)
    7. Duplicate payment creation is rejected
    8. Payment for cancelled order is rejected

  Task 2 — Coupon and checkout integrity:
    1. Coupon cannot be applied twice to the same order
    2. Coupon cannot be applied to another user's order
    3. Coupon cannot be applied to a non-PENDING order
    4. Coupon cannot be applied to an order with an existing payment
    5. Per-user coupon usage limit is enforced
    6. Expired coupons are rejected
    7. Coupon minimum order amount is enforced
    8. Checkout deducts stock atomically
    9. Checkout rejects when stock is insufficient
    10. Checkout rejects an empty cart
"""

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product, Category, Brand
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem, ShippingAddress
from payments.models import Payment
from coupons.models import Coupon, CouponUsage

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
class PaymentSecurityTests(TestCase):
    """Verify payment lifecycle integrity and security."""

    def setUp(self):
        # Customer
        self.customer = User.objects.create_user(
            username="customer_pay",
            email="customer_pay@example.com",
            password="CustPass123!",
            first_name="Customer",
            user_type="customer",
        )
        self.client_customer = APIClient()
        self.client_customer.force_authenticate(user=self.customer)

        # Another customer
        self.customer_b = User.objects.create_user(
            username="customer_b",
            email="customer_b@example.com",
            password="CustBPass123!",
            first_name="CustomerB",
            user_type="customer",
        )
        self.client_customer_b = APIClient()
        self.client_customer_b.force_authenticate(user=self.customer_b)

        # Shop Owner
        self.owner = User.objects.create_user(
            username="owner_pay",
            email="owner_pay@example.com",
            password="OwnerPass123!",
            first_name="Owner",
            user_type="owner",
        )
        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

        # Catalog
        self.category = Category.objects.create(name="TestCat")
        self.brand = Brand.objects.create(name="TestBrand")
        self.product = Product.objects.create(
            name="Test Widget",
            description="A test widget",
            price=Decimal("50.00"),
            stock=20,
            category=self.category,
            brand=self.brand,
            is_available=True,
        )

        # Customer's order
        self.order = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("100.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=Decimal("50.00"),
        )
        ShippingAddress.objects.create(
            order=self.order,
            full_name="Customer Pay",
            phone="1234567890",
            address="123 Pay St",
            city="Payville",
            state="PA",
            postal_code="12345",
            country="USA",
        )

    # ---- Payment state machine tests ----

    def test_payment_amount_matches_order_total(self):
        """Payment amount must be server-computed from order.total_price."""
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.amount, self.order.total_price)

    def test_duplicate_payment_rejected(self):
        """Cannot create two payments for the same order."""
        Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_for_cancelled_order_rejected(self):
        """Cannot create payment for a cancelled order."""
        self.order.status = "CANCELLED"
        self.order.save(update_fields=["status"])
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_payment_method_rejected(self):
        """Payment method must be one of the valid choices."""
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "BITCOIN"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid payment method.", str(resp.data))

    def test_razorpay_payment_method_rejected(self):
        """Razorpay requests are rejected while gateway credentials are not configured."""
        with override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET=""):
            initial_payment_count = Payment.objects.count()
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Razorpay payment gateway is not configured.", str(resp.data))
            self.assertEqual(Payment.objects.count(), initial_payment_count)
            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PENDING")

    def test_stripe_payment_method_rejected(self):
        """Stripe requests are rejected while gateway integration is inactive."""
        initial_payment_count = Payment.objects.count()
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "STRIPE"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("STRIPE payment gateway is currently inactive", str(resp.data))
        self.assertEqual(Payment.objects.count(), initial_payment_count)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    def test_rejected_payment_leaves_inventory_and_order_unaltered(self):
        """Rejected payments do not change catalog stock or order state."""
        self.product.refresh_from_db()
        initial_stock = self.product.stock
        with override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET=""):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.product.refresh_from_db()
            self.assertEqual(self.product.stock, initial_stock)
            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PENDING")
            self.assertFalse(Payment.objects.filter(order=self.order).exists())


    def test_customer_cannot_forge_paid_status_on_creation(self):
        """Customer cannot pass payment_status=SUCCESS to mark order paid."""
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD", "payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_status, "PENDING")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    # ---- Admin payment status transitions ----

    def test_admin_can_mark_payment_success(self):
        """Owner can transition PENDING -> SUCCESS."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "SUCCESS")
        self.assertIsNotNone(payment.paid_at)

    def test_payment_success_syncs_order_to_processing(self):
        """When payment is marked SUCCESS, order should move from PENDING to PROCESSING."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")

    def test_admin_can_mark_payment_failed(self):
        """Owner can transition PENDING -> FAILED."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "FAILED"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "FAILED")

    def test_admin_can_refund_successful_payment(self):
        """Owner can transition SUCCESS -> REFUNDED."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="SUCCESS",
            amount=Decimal("100.00"),
            paid_at=timezone.now(),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "REFUNDED"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "REFUNDED")

    def test_invalid_transition_pending_to_refunded_rejected(self):
        """Cannot skip PENDING -> REFUNDED."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "REFUNDED"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "PENDING")

    def test_invalid_transition_failed_to_success_rejected(self):
        """Cannot recover FAILED -> SUCCESS."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="FAILED",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_transition_refunded_to_success_rejected(self):
        """Cannot reverse REFUNDED -> SUCCESS."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="REFUNDED",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- Customer cannot forge payment status ----

    def test_customer_cannot_update_payment_status(self):
        """Customer cannot use admin endpoint to change payment status."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_customer.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "PENDING")

    # ---- Cancel order protections ----

    def test_cancel_paid_order_rejected(self):
        """Cannot cancel an order whose payment has succeeded."""
        Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="SUCCESS",
            amount=Decimal("100.00"),
            paid_at=timezone.now(),
        )
        resp = self.client_customer.patch(
            f"/api/v1/orders/orders/{self.order.id}/cancel/",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    def test_cancel_unpaid_order_restores_stock(self):
        """Cancelling an unpaid pending order restores product stock."""
        original_stock = self.product.stock
        # Order has 2 items with quantity 2 each = 2 items deducted
        resp = self.client_customer.patch(
            f"/api/v1/orders/orders/{self.order.id}/cancel/",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, original_stock + 2)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")

    def test_cancel_non_pending_order_rejected(self):
        """Cannot cancel orders that are not PENDING."""
        self.order.status = "SHIPPED"
        self.order.save(update_fields=["status"])
        resp = self.client_customer.patch(
            f"/api/v1/orders/orders/{self.order.id}/cancel/",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_online_payment_success_requires_transaction_id(self):
        """Razorpay/Stripe payment needs transaction_id for SUCCESS."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "PENDING")

    def test_online_payment_success_with_transaction_id_accepted(self):
        """Razorpay/Stripe payment with transaction_id for SUCCESS is accepted."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=Decimal("100.00"),
        )
        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS", "transaction_id": "pay_test123"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "SUCCESS")
        self.assertEqual(payment.transaction_id, "pay_test123")


@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "api-login": None,
        "api-register": None,
        "forgot_password": None,
    }
)
class CouponAndCheckoutIntegrityTests(TestCase):
    """Verify coupon application logic and checkout transactional integrity."""

    def setUp(self):
        # Customer
        self.customer = User.objects.create_user(
            username="coupon_cust",
            email="coupon_cust@example.com",
            password="CouponPass123!",
            first_name="CouponCust",
            user_type="customer",
        )
        self.client_customer = APIClient()
        self.client_customer.force_authenticate(user=self.customer)

        # Another customer
        self.customer_b = User.objects.create_user(
            username="coupon_b",
            email="coupon_b@example.com",
            password="CouponBPass123!",
            first_name="CouponB",
            user_type="customer",
        )
        self.client_customer_b = APIClient()
        self.client_customer_b.force_authenticate(user=self.customer_b)

        # Catalog
        self.category = Category.objects.create(name="CouponCat")
        self.brand = Brand.objects.create(name="CouponBrand")
        self.product = Product.objects.create(
            name="Coupon Widget",
            description="Widget for coupon tests",
            price=Decimal("100.00"),
            stock=50,
            category=self.category,
            brand=self.brand,
            is_available=True,
        )

        # Customer's order
        self.order = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("200.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=Decimal("100.00"),
        )

        now = timezone.now()
        # Valid coupon
        self.coupon = Coupon.objects.create(
            name="Test20",
            code="TEST20",
            discount_type="PERCENTAGE",
            discount_value=Decimal("20.00"),
            minimum_order_amount=Decimal("50.00"),
            valid_from=now - timedelta(days=1),
            valid_to=now + timedelta(days=30),
            is_active=True,
        )

    # ---- Coupon application tests ----

    def test_apply_valid_coupon(self):
        """Valid coupon applies successfully and updates order total."""
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        # 20% off 200 = 40 discount -> 160
        self.assertEqual(self.order.total_price, Decimal("160.00"))

    def test_cannot_apply_coupon_twice_same_order(self):
        """Cannot apply any coupon to an order that already has one."""
        self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_per_user_coupon_usage_limit(self):
        """Same user cannot use the same coupon on two different orders."""
        self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        # Create a second order
        order2 = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("200.00"),
        )
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{order2.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_apply_coupon_to_other_users_order(self):
        """Customer B cannot apply coupon to Customer A's order."""
        resp = self.client_customer_b.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.total_price, Decimal("200.00"))

    def test_cannot_apply_coupon_to_non_pending_order(self):
        """Coupons can only be applied to PENDING orders."""
        self.order.status = "PROCESSING"
        self.order.save(update_fields=["status"])
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_apply_coupon_when_payment_exists(self):
        """Coupon cannot be applied if a payment already exists for the order."""
        Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("200.00"),
        )
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_coupon_rejected(self):
        """Expired coupons are rejected."""
        now = timezone.now()
        expired = Coupon.objects.create(
            name="Expired10",
            code="EXPIRED10",
            discount_type="FIXED",
            discount_value=Decimal("10.00"),
            minimum_order_amount=Decimal("0.00"),
            valid_from=now - timedelta(days=30),
            valid_to=now - timedelta(days=1),
            is_active=True,
        )
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "EXPIRED10"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_minimum_order_amount_enforced(self):
        """Coupon with minimum_order_amount higher than order total is rejected."""
        now = timezone.now()
        high_min = Coupon.objects.create(
            name="HighMin",
            code="HIGHMIN",
            discount_type="PERCENTAGE",
            discount_value=Decimal("10.00"),
            minimum_order_amount=Decimal("999.00"),
            valid_from=now - timedelta(days=1),
            valid_to=now + timedelta(days=30),
            is_active=True,
        )
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "HIGHMIN"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_coupon_rejected(self):
        """Inactive coupons are rejected."""
        self.coupon.is_active = False
        self.coupon.save(update_fields=["is_active"])
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_coupon_code_rejected(self):
        """Empty or whitespace-only coupon code is rejected."""
        resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "   "},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- Checkout integrity tests ----

    def test_checkout_deducts_stock(self):
        """Successful checkout deducts product stock."""
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=3)
        original_stock = self.product.stock

        resp = self.client_customer.post(
            "/api/v1/orders/checkout/",
            {
                "shipping_address": {
                    "full_name": "Test User",
                    "phone": "1234567890",
                    "address": "123 Test St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "12345",
                    "country": "Testland",
                }
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, original_stock - 3)

    def test_checkout_rejects_insufficient_stock(self):
        """Checkout fails if product stock is less than cart quantity."""
        self.product.stock = 1
        self.product.save(update_fields=["stock"])

        cart = Cart.objects.create(user=self.customer_b)
        CartItem.objects.create(cart=cart, product=self.product, quantity=5)

        resp = self.client_customer_b.post(
            "/api/v1/orders/checkout/",
            {
                "shipping_address": {
                    "full_name": "Test B",
                    "phone": "9876543210",
                    "address": "456 Test Rd",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "54321",
                    "country": "Testland",
                }
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_rejects_empty_cart(self):
        """Checkout fails if cart is empty."""
        Cart.objects.create(user=self.customer_b)
        resp = self.client_customer_b.post(
            "/api/v1/orders/checkout/",
            {
                "shipping_address": {
                    "full_name": "Empty Cart",
                    "phone": "0000000000",
                    "address": "Nowhere",
                    "city": "Empty",
                    "state": "EM",
                    "postal_code": "00000",
                    "country": "Void",
                }
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_clears_cart(self):
        """Cart items are cleared after successful checkout."""
        cart = Cart.objects.create(user=self.customer_b)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        self.client_customer_b.post(
            "/api/v1/orders/checkout/",
            {
                "shipping_address": {
                    "full_name": "CartClear",
                    "phone": "1111111111",
                    "address": "Clear St",
                    "city": "ClearCity",
                    "state": "CL",
                    "postal_code": "11111",
                    "country": "Clearland",
                }
            },
            format="json",
        )
        self.assertEqual(CartItem.objects.filter(cart=cart).count(), 0)

    def test_checkout_order_total_is_server_computed(self):
        """Order total_price is computed from product prices, not from client input."""
        cart = Cart.objects.create(user=self.customer_b)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)

        resp = self.client_customer_b.post(
            "/api/v1/orders/checkout/",
            {
                "shipping_address": {
                    "full_name": "ServerComp",
                    "phone": "2222222222",
                    "address": "Server St",
                    "city": "ServerCity",
                    "state": "SV",
                    "postal_code": "22222",
                    "country": "Serverland",
                },
                "total_price": "0.01",  # Attacker tries to set price
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=resp.data["id"])
        # Server computed: 2 * 100.00 = 200.00
        self.assertEqual(order.total_price, Decimal("200.00"))

    def test_coupon_discount_flows_to_payment_amount(self):
        """Applying coupon reduces order total and subsequent payment amount reflects discount."""
        # Order is 200.00, coupon gives 20% discount = 40.00 -> 160.00
        apply_resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(apply_resp.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.total_price, Decimal("160.00"))

        # Create payment for this discounted order
        pay_resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.amount, Decimal("160.00"))

    def test_cancel_unpaid_order_releases_coupon_for_reuse(self):
        """Cancelling an unpaid pending order releases the coupon so the user can reuse it."""
        # Apply coupon to initial order
        self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{self.order.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(CouponUsage.objects.filter(user=self.customer, coupon=self.coupon).count(), 1)

        # Cancel the unpaid order
        cancel_resp = self.client_customer.patch(
            f"/api/v1/orders/orders/{self.order.id}/cancel/",
        )
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(CouponUsage.objects.filter(user=self.customer, coupon=self.coupon).count(), 0)

        # Create a second order and verify user can reapply the coupon
        order2 = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("200.00"),
        )
        reapply_resp = self.client_customer.post(
            f"/api/v1/coupons/coupons/apply/{order2.id}/",
            {"code": "TEST20"},
        )
        self.assertEqual(reapply_resp.status_code, status.HTTP_200_OK)
        order2.refresh_from_db()
        self.assertEqual(order2.total_price, Decimal("160.00"))
        self.assertEqual(CouponUsage.objects.filter(user=self.customer, coupon=self.coupon).count(), 1)

