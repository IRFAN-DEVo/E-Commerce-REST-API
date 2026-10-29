"""
Stage 4 Production Readiness, Security, Financial, and Concurrency Test Suite.
"""
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product, Category, Brand
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem, ShippingAddress
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
class Stage4ReadinessTests(TestCase):
    """Comprehensive tests for Stage 4 security, financial, and inventory fixes."""

    def setUp(self):
        # Customer A
        self.customer_a = User.objects.create_user(
            username="cust_a",
            email="cust_a@example.com",
            password="Password123!",
            first_name="CustomerA",
            user_type="customer",
        )
        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.customer_a)

        # Customer B
        self.customer_b = User.objects.create_user(
            username="cust_b",
            email="cust_b@example.com",
            password="Password123!",
            first_name="CustomerB",
            user_type="customer",
        )
        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.customer_b)

        # Shop Owner / Admin
        self.owner = User.objects.create_user(
            username="shop_owner",
            email="owner@example.com",
            password="OwnerPassword123!",
            first_name="Owner",
            user_type="owner",
        )
        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

        # Catalog setup
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="Sony")
        self.product = Product.objects.create(
            name="Wireless Headphones",
            description="Noise-cancelling headphones",
            price=Decimal("150.00"),
            stock=10,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )

        # Standard shipping address dict
        self.valid_shipping_address = {
            "full_name": "Alice Smith",
            "phone": "9876543210",
            "address": "123 Main Street",
            "city": "Metropolis",
            "state": "NY",
            "postal_code": "10001",
            "country": "USA",
        }

    # ==========================================
    # 1. Concurrency and Stock Verification
    # ==========================================

    def test_checkout_atomically_deducts_stock(self):
        """Checkout correctly deducts stock and clears user cart."""
        cart, _ = Cart.objects.get_or_create(user=self.customer_a)
        CartItem.objects.create(cart=cart, product=self.product, quantity=3)

        resp = self.client_a.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": self.valid_shipping_address},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)
        # Cart items remain until payment is initiated/confirmed
        self.assertEqual(cart.cart_items.count(), 1)
        # Completing payment clears the cart
        order_id = resp.data["id"]
        pay_resp = self.client_a.post(
            f"/api/v1/payments/orders/{order_id}/payments/",
            {"payment_method": "COD"},
            format="json",
        )
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(cart.cart_items.count(), 0)

    def test_checkout_fails_if_stock_insufficient(self):
        """Checkout rejects if requested quantity exceeds current stock."""
        cart, _ = Cart.objects.get_or_create(user=self.customer_a)
        CartItem.objects.create(cart=cart, product=self.product, quantity=15)

        resp = self.client_a.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": self.valid_shipping_address},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)  # Unaltered

    # ==========================================
    # 2. Admin Order Cancellation Safety
    # ==========================================

    def test_admin_cancel_order_restores_stock_and_coupon(self):
        """When admin cancels a PENDING order, product stock and coupon usage are restored."""
        coupon = Coupon.objects.create(
            name="SAVE10",
            code="SAVE10",
            discount_type="FIXED",
            discount_value=Decimal("10.00"),
            minimum_order_amount=Decimal("50.00"),
            valid_from="2020-01-01T00:00:00Z",
            valid_to="2035-12-31T23:59:59Z",
            is_active=True,
        )

        # Create order with 4 items
        order = Order.objects.create(
            user=self.customer_a,
            status="PENDING",
            total_price=Decimal("600.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=4,
            price=self.product.price,
        )
        self.product.stock = 6
        self.product.save(update_fields=["stock"])

        # Apply coupon
        CouponUsage.objects.create(
            user=self.customer_a,
            coupon=coupon,
            order=order,
            order_amount=Decimal("600.00"),
            discount_amount=Decimal("10.00"),
        )
        self.assertEqual(CouponUsage.objects.filter(order=order).count(), 1)

        # Admin cancels the order
        resp = self.client_owner.patch(
            f"/api/v1/orders/admin/orders/{order.id}/status/",
            {"status": "CANCELLED"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, "CANCELLED")

        # Verify stock was restored from 6 to 10
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

        # Verify coupon usage was released
        self.assertEqual(CouponUsage.objects.filter(order=order).count(), 0)

    def test_admin_cancel_paid_order_directly_is_rejected(self):
        """Admin cannot transition an order with SUCCESS payment directly to CANCELLED without refund."""
        order = Order.objects.create(
            user=self.customer_a,
            status="PENDING",
            total_price=Decimal("150.00"),
        )
        Payment.objects.create(
            order=order,
            payment_method="COD",
            payment_status="SUCCESS",
            amount=Decimal("150.00"),
        )

        resp = self.client_owner.patch(
            f"/api/v1/orders/admin/orders/{order.id}/status/",
            {"status": "CANCELLED"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertNotEqual(order.status, "CANCELLED")

    # ==========================================
    # 3. Payment State Machine and Cancelled Orders
    # ==========================================

    def test_cannot_mark_payment_success_on_cancelled_order(self):
        """Admin cannot mark payment status as SUCCESS if the order is already CANCELLED."""
        order = Order.objects.create(
            user=self.customer_a,
            status="CANCELLED",
            total_price=Decimal("150.00"),
        )
        payment = Payment.objects.create(
            order=order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("150.00"),
        )

        resp = self.client_owner.patch(
            f"/api/v1/payments/admin/payments/{payment.id}/status/",
            {"payment_status": "SUCCESS"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "PENDING")

    def test_customer_cancel_order_marks_pending_payment_as_failed(self):
        """When a customer cancels an order, an associated PENDING payment transitions to FAILED."""
        order = Order.objects.create(
            user=self.customer_a,
            status="PENDING",
            total_price=Decimal("150.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=self.product.price,
        )
        payment = Payment.objects.create(
            order=order,
            payment_method="COD",
            payment_status="PENDING",
            amount=Decimal("150.00"),
        )

        resp = self.client_a.patch(
            f"/api/v1/orders/orders/{order.id}/cancel/",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(order.status, "CANCELLED")
        self.assertEqual(payment.payment_status, "FAILED")

    # ==========================================
    # 4. Cart Stock and Availability Validation
    # ==========================================

    def test_cart_item_update_quantity_exceeding_stock_rejected(self):
        """PATCH /api/v1/cart/cart/items/<id>/ rejects quantity exceeding available stock."""
        cart, _ = Cart.objects.get_or_create(user=self.customer_a)
        cart_item = CartItem.objects.create(cart=cart, product=self.product, quantity=2)

        resp = self.client_a.patch(
            f"/api/v1/cart/cart/items/{cart_item.id}/",
            {"quantity": 100},  # Stock is only 10
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_unavailable_product_to_cart_rejected(self):
        """Adding a deactivated product to cart is rejected."""
        self.product.is_available = False
        self.product.save(update_fields=["is_available"])

        resp = self.client_a.post(
            "/api/v1/cart/cart/items/",
            {"product": self.product.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 5. Input Validation: Shipping Address & Pricing
    # ==========================================

    def test_checkout_rejects_missing_shipping_fields(self):
        """CheckoutSerializer rejects missing shipping fields."""
        cart, _ = Cart.objects.get_or_create(user=self.customer_a)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        resp = self.client_a.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": {"full_name": "Incomplete"}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_rejects_overlong_postal_code(self):
        """CheckoutSerializer rejects postal codes exceeding maximum model length (10 chars)."""
        cart, _ = Cart.objects.get_or_create(user=self.customer_a)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)

        bad_address = dict(self.valid_shipping_address)
        bad_address["postal_code"] = "12345678901234567890"  # 20 chars

        resp = self.client_a.post(
            "/api/v1/orders/checkout/",
            {"shipping_address": bad_address},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_serializer_rejects_invalid_pricing(self):
        """Product creation rejects price <= 0 and discount_price >= price."""
        # Test zero price
        resp = self.client_owner.post(
            "/api/v1/products/products/create/",
            {
                "name": "Free Product",
                "description": "Desc",
                "price": "0.00",
                "stock": 10,
                "category_id": self.category.id,
                "brand_id": self.brand.id,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Test discount_price >= price
        resp2 = self.client_owner.post(
            "/api/v1/products/products/create/",
            {
                "name": "Bad Discount Product",
                "description": "Desc",
                "price": "50.00",
                "discount_price": "60.00",
                "stock": 10,
                "category_id": self.category.id,
                "brand_id": self.brand.id,
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 6. IDOR and Review Mutation Protections
    # ==========================================

    def test_cannot_change_reviewed_product_on_update(self):
        """Review update rejects modifying the product foreign key."""
        product_b = Product.objects.create(
            name="Speaker",
            description="Bluetooth speaker",
            price=Decimal("80.00"),
            stock=5,
            category=self.category,
            brand=self.brand,
        )
        review = Review.objects.create(
            user=self.customer_a,
            product=self.product,
            rating=5,
            comment="Great headphones!",
        )

        resp = self.client_a.patch(
            f"/api/v1/reviews/reviews/{review.id}/update/",
            {"product": product_b.id, "comment": "Changed"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        review.refresh_from_db()
        self.assertEqual(review.product_id, self.product.id)

    def test_cross_customer_idor_protections(self):
        """Customers cannot access or cancel orders belonging to other customers."""
        order_b = Order.objects.create(
            user=self.customer_b,
            status="PENDING",
            total_price=Decimal("100.00"),
        )

        # Customer A tries to retrieve Customer B's order
        resp_get = self.client_a.get(f"/api/v1/orders/orders/{order_b.id}/")
        self.assertEqual(resp_get.status_code, status.HTTP_404_NOT_FOUND)

        # Customer A tries to cancel Customer B's order
        resp_cancel = self.client_a.patch(f"/api/v1/orders/orders/{order_b.id}/cancel/")
        self.assertEqual(resp_cancel.status_code, status.HTTP_400_BAD_REQUEST)
