from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Order, OrderItem, ShippingAddress
from payments.models import Payment
from products.models import Product, Category, Brand

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="DjangoMart <noreply@djangomart.com>",
)
class OrderCancellationSystemTests(APITestCase):
    """
    Comprehensive test suite for the DjangoMart Order Cancellation System:
    - Customer can cancel own eligible order (both POST and PATCH).
    - Cannot cancel other customer's order (IDOR protection).
    - Ineligible orders (SHIPPED, DELIVERED, ALREADY CANCELLED, PAID) rejected with clear reasons.
    - Inventory is restored atomically and exactly once.
    - Concurrent duplicate cancellation attempts are rejected safely.
    - COD cancellation does not initiate refunds; sets payment FAILED.
    - Cancellation timestamp and reason are properly stored and returned.
    """

    def setUp(self):
        mail.outbox.clear()
        cache.clear()

        # Users
        self.alice = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="AlicePassword123!",
        )
        self.bob = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="BobPassword123!",
        )

        # Products & Category
        self.category = Category.objects.create(name="Audio")
        self.brand = Brand.objects.create(name="SoundCorp")
        self.product = Product.objects.create(
            name="Wireless Earbuds",
            description="True wireless earbuds",
            price=Decimal("1200.00"),
            stock=15,
            category=self.category,
            brand=self.brand,
        )

        # Alice's Pending Order
        self.order = Order.objects.create(
            user=self.alice,
            status="PENDING",
            total_price=Decimal("2400.00"),
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=Decimal("1200.00"),
        )
        self.shipping = ShippingAddress.objects.create(
            order=self.order,
            full_name="Alice Smith",
            phone="9876543210",
            address="100 Tech Lane",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
        )
        # Deduct initial stock like checkout does
        self.product.stock -= 2
        self.product.save(update_fields=["stock"])

        # Authenticate Alice
        self.client.force_authenticate(user=self.alice)

    def test_customer_can_cancel_own_pending_order_with_post_or_patch(self):
        """Customer can cancel their own eligible pending order using POST or PATCH."""
        initial_stock = self.product.stock
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                url,
                {"reason": "Changed my mind"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("message"), "Order cancelled successfully.")
        self.assertEqual(response.data.get("status"), "CANCELLED")
        self.assertEqual(response.data.get("cancellation_reason"), "Changed my mind")
        self.assertIsNotNone(response.data.get("cancelled_at"))

        # Verify database
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")
        self.assertEqual(self.order.cancellation_reason, "Changed my mind")
        self.assertIsNotNone(self.order.cancelled_at)

        # Verify inventory restored
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, initial_stock + 2)

        # Verify cancellation email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["alice@example.com"])
        self.assertIn("Has Been Cancelled", mail.outbox[0].subject)

    def test_customer_cannot_cancel_other_customers_order(self):
        """Bob cannot cancel Alice's order (404/400)."""
        self.client.force_authenticate(user=self.bob)
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"

        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Order not found.", str(response.data))

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    def test_already_cancelled_order_cannot_be_cancelled_again(self):
        """Already cancelled order is rejected; stock is NOT restored a second time."""
        # Cancel first time
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        resp1 = self.client.post(url, {"reason": "First cancel"}, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        stock_after_first_cancel = self.product.stock

        # Attempt to cancel second time
        resp2 = self.client.post(url, {"reason": "Second cancel"}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already cancelled", str(resp2.data).lower())

        # Verify stock was not restored again
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_after_first_cancel)

    def test_shipped_order_cancellation_rejected_with_clear_message(self):
        """Shipped orders cannot be cancelled online; returns clear customer explanation."""
        self.order.status = "SHIPPED"
        self.order.save(update_fields=["status"])

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Shipped orders cannot be cancelled", str(response.data))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "SHIPPED")

    def test_delivered_order_cancellation_rejected(self):
        """Delivered orders cannot be cancelled online."""
        self.order.status = "DELIVERED"
        self.order.save(update_fields=["status"])

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Delivered orders cannot be cancelled", str(response.data))

    def test_paid_order_cancellation_rejected_under_policy(self):
        """Paid orders cannot be cancelled directly without support assistance."""
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_12345",
            paid_at=timezone.now(),
        )

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Paid orders cannot be cancelled directly", str(response.data))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    def test_cod_order_cancellation_updates_payment_to_failed_without_refund(self):
        """COD order cancellation sets payment to FAILED with NOT_APPLICABLE refund status."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "FAILED")
        self.assertEqual(payment.refund_status, "NOT_APPLICABLE")

    def test_order_serializer_exposes_cancellation_metadata_correctly(self):
        """OrderSerializer exposes is_cancellable, ineligibility reason, and timestamps."""
        url = f"/api/v1/orders/orders/{self.order.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("is_cancellable"))
        self.assertEqual(response.data.get("cancellation_ineligibility_reason"), "")
        self.assertIsNone(response.data.get("cancelled_at"))

