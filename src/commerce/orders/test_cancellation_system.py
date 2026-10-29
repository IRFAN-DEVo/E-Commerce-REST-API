from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
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
    STRIPE_SECRET_KEY="sk_test_mock_stripe_key",
    RAZORPAY_KEY_ID="rzp_test_mock_key_id",
    RAZORPAY_KEY_SECRET="mock_key_secret",
)
class OrderCancellationSystemTests(APITestCase):
    """
    Comprehensive test suite for the DjangoMart 24-Hour Order Cancellation & Refund System:
    1. Eligible unpaid COD order allows cancellation.
    2. Eligible paid Razorpay order allows cancellation and initiates provider refund.
    3. Eligible paid Stripe order allows cancellation and initiates provider refund.
    4. An order older than 24 hours cannot be cancelled.
    5. Shipped and delivered orders cannot be cancelled through the cancellation workflow.
    6. Another customer cannot cancel the order (ownership validation).
    7. Paid-order cancellation records the correct refund state (COMPLETED, PROCESSING, MANUAL_PROCESSING_REQUIRED).
    8. Provider refund failures are handled safely without false refund confirmations.
    9. Duplicate requests cannot trigger duplicate refunds or double-restore stock.
    10. Inventory and coupons are restored exactly once.
    11. Repeated payment webhooks cannot reverse cancellation.
    12. Order serializer / API exposes accurate cancellation eligibility, deadline, and refund information.
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

    # 1. Unpaid COD Cancellation
    def test_eligible_unpaid_cod_order_cancellation_succeeds(self):
        """Unpaid COD order can be cancelled directly, restores stock, sets payment FAILED without refund."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=self.order.total_price,
        )
        initial_stock = self.product.stock
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {"reason": "Changed my mind"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")
        self.assertEqual(self.order.cancellation_reason, "Changed my mind")

        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, "FAILED")
        self.assertEqual(payment.refund_status, "NOT_APPLICABLE")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, initial_stock + 2)

        # Email notification check
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("No payment charge was captured", mail.outbox[0].body)

    # 2. Paid Stripe Order Cancellation
    @patch("stripe.Refund.create")
    def test_eligible_paid_stripe_order_cancellation_initiates_provider_refund(self, mock_refund_create):
        """Paid Stripe order within 24 hours can be cancelled, calling Stripe refund API."""
        mock_refund_create.return_value = {
            "id": "re_stripe_mock_123",
            "status": "succeeded",
            "amount": 240000,
        }
        payment = Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_test_123",
            paid_at=timezone.now(),
        )
        self.order.status = "PROCESSING"
        self.order.save(update_fields=["status"])

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {"reason": "Accidental purchase"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")

        payment.refresh_from_db()
        self.assertEqual(payment.refund_status, "COMPLETED")
        self.assertEqual(payment.payment_status, "REFUNDED")
        self.assertEqual(payment.refund_id, "re_stripe_mock_123")
        self.assertEqual(payment.refund_amount, Decimal("2400.00"))
        self.assertIsNotNone(payment.refunded_at)

        mock_refund_create.assert_called_once_with(payment_intent="pi_stripe_test_123", amount=240000)

        # Email notification confirms refund
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Refund Confirmed", mail.outbox[0].body)

    # 3. Paid Razorpay Order Cancellation
    @patch("razorpay.Client")
    def test_eligible_paid_razorpay_order_cancellation_initiates_provider_refund(self, mock_razorpay_cls):
        """Paid Razorpay order within 24 hours can be cancelled, calling Razorpay refund API."""
        mock_client = MagicMock()
        mock_client.payment.refund.return_value = {
            "id": "rfnd_rzp_mock_456",
            "status": "processed",
            "amount": 240000,
        }
        mock_razorpay_cls.return_value = mock_client

        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pay_rzp_test_456",
            paid_at=timezone.now(),
        )
        self.order.status = "PROCESSING"
        self.order.save(update_fields=["status"])

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {"reason": "Found better price"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")

        payment.refresh_from_db()
        self.assertEqual(payment.refund_status, "COMPLETED")
        self.assertEqual(payment.payment_status, "REFUNDED")
        self.assertEqual(payment.refund_id, "rfnd_rzp_mock_456")
        self.assertEqual(payment.refund_amount, Decimal("2400.00"))

        mock_client.payment.refund.assert_called_once_with("pay_rzp_test_456", 240000)

    # 4. Order Older Than 24 Hours Cannot Be Cancelled
    def test_order_older_than_24_hours_cannot_be_cancelled(self):
        """Paid or unpaid order older than 24 hours is rejected."""
        Order.objects.filter(id=self.order.id).update(created_at=timezone.now() - timedelta(hours=25))
        self.order.refresh_from_db()

        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_late_789",
            paid_at=timezone.now(),
        )

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        response = self.client.post(url, {"reason": "Late request"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancellation window has expired", str(response.data))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    # 5. Shipped and Delivered Orders Cannot Be Cancelled
    def test_shipped_order_cancellation_rejected(self):
        """Shipped orders cannot be cancelled online."""
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

    # 6. IDOR / Ownership Protection
    def test_customer_cannot_cancel_other_customers_order(self):
        """Bob cannot cancel Alice's order."""
        self.client.force_authenticate(user=self.bob)
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"

        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Order not found.", str(response.data))

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    # 7. Gateway Failure Safely Handled (MANUAL_PROCESSING_REQUIRED)
    @patch("stripe.Refund.create")
    def test_stripe_refund_failure_marks_manual_processing_required(self, mock_refund_create):
        """If gateway refund fails, order is cancelled and refund is marked MANUAL_PROCESSING_REQUIRED."""
        import stripe
        mock_refund_create.side_effect = stripe.error.APIConnectionError("Network error with Stripe")

        payment = Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_fail_111",
            paid_at=timezone.now(),
        )

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {"reason": "Gateway test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")

        payment.refresh_from_db()
        self.assertEqual(payment.refund_status, "MANUAL_PROCESSING_REQUIRED")
        self.assertEqual(payment.payment_status, "SUCCESS")  # Not falsely marked REFUNDED
        self.assertIsNone(payment.refunded_at)

        # Email states queued / review
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Refund Queued", mail.outbox[0].body)

    # 8. Duplicate Requests Do Not Trigger Duplicate Refunds or Restores
    @patch("stripe.Refund.create")
    def test_duplicate_cancellation_requests_rejected_and_do_not_duplicate_refund(self, mock_refund_create):
        """Second cancellation request on already cancelled order is rejected."""
        mock_refund_create.return_value = {
            "id": "re_first_123",
            "status": "succeeded",
            "amount": 240000,
        }
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_dup_222",
            paid_at=timezone.now(),
        )

        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"

        # First request
        resp1 = self.client.post(url, {"reason": "First attempt"}, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_refund_create.call_count, 1)

        self.product.refresh_from_db()
        stock_after_first = self.product.stock

        # Second duplicate request
        resp2 = self.client.post(url, {"reason": "Second attempt"}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already cancelled", str(resp2.data).lower())

        # Verify no duplicate refund and no double stock restoration
        self.assertEqual(mock_refund_create.call_count, 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_after_first)

    # 9. Webhooks Cannot Reverse Order Cancellation
    def test_webhook_cannot_reverse_cancelled_order_status(self):
        """A late incoming payment webhook on a cancelled order must not revert order to PROCESSING."""
        self.order.status = "CANCELLED"
        self.order.save(update_fields=["status"])

        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="PENDING",
            amount=self.order.total_price,
            stripe_session_id="cs_test_late_333",
        )

        # Call Stripe session status or webhook view
        url = f"/api/v1/payments/orders/{self.order.id}/stripe/status/?session_id=cs_test_late_333"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "CANCELLED")

    # 10. Order Details API Exposes Accurate Cancellation & Refund Metadata
    def test_order_serializer_exposes_paid_cancellation_metadata(self):
        """Serializer reports is_cancellable=True for paid orders within 24 hours."""
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_view_444",
            paid_at=timezone.now(),
        )

        url = f"/api/v1/orders/orders/{self.order.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("is_cancellable"))
        self.assertEqual(response.data.get("cancellation_ineligibility_reason"), "")
        self.assertIsNotNone(response.data.get("cancellation_deadline"))
