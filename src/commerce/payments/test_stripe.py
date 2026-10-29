import json
from decimal import Decimal
from unittest.mock import patch, MagicMock

import stripe
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from orders.models import Order, OrderItem, ShippingAddress
from products.models import Product, Category, Brand
from payments.models import Payment, StripeWebhookEvent

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
class StripePaymentIntegrationTests(TestCase):
    """
    Automated test suite verifying Stripe Hosted Checkout integration,
    Webhook verification, security, deduplication, currency rules,
    and inventory integrity. All Stripe API calls are mocked.
    """

    def setUp(self):
        self.client_customer = APIClient()
        self.client_other = APIClient()

        # Alice (Customer 1)
        self.customer = User.objects.create_user(
            username="alice_stripe",
            email="alice@example.com",
            password="SecurePassword123!",
            is_email_verified=True,
        )
        self.client_customer.force_authenticate(user=self.customer)

        # Bob (Customer 2)
        self.other_customer = User.objects.create_user(
            username="bob_stripe",
            email="bob@example.com",
            password="SecurePassword123!",
            is_email_verified=True,
        )
        self.client_other.force_authenticate(user=self.other_customer)

        # Catalog setup
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="TechCo")
        self.product = Product.objects.create(
            name="Mechanical Keyboard",
            price=Decimal("1500.00"),
            stock=10,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )

        # Order for Alice (Stock was already deducted to 10 at checkout)
        self.order = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("1500.00"),
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=Decimal("1500.00"),
        )
        self.shipping_address = ShippingAddress.objects.create(
            order=self.order,
            full_name="Alice Wonderland",
            phone="9876543210",
            address="42 Rabbit Hole Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
        )

        self.mock_secret_key = "sk_test_mock_secret_key_123"
        self.mock_pub_key = "pk_test_mock_pub_key_123"
        self.mock_webhook_secret = "whsec_mock_webhook_secret_123"

    # --- 1. Successful Checkout Session Creation ---

    @patch("stripe.checkout.Session.create")
    def test_stripe_checkout_session_creation_success(self, mock_session_create):
        """Verifies session creation with server-calculated amount, currency, and metadata."""
        mock_session_create.return_value = MagicMock(
            id="cs_test_session_abc123",
            url="https://checkout.stripe.com/c/pay/cs_test_session_abc123",
        )

        with override_settings(
            STRIPE_SECRET_KEY=self.mock_secret_key,
            STRIPE_PUBLISHABLE_KEY=self.mock_pub_key,
            STRIPE_CURRENCY="inr",
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["stripe_session_id"], "cs_test_session_abc123")
        self.assertEqual(
            resp.data["session_url"],
            "https://checkout.stripe.com/c/pay/cs_test_session_abc123",
        )
        self.assertEqual(resp.data["publishable_key"], self.mock_pub_key)
        self.assertEqual(resp.data["amount_subunits"], 150000)  # ₹1500.00 * 100 paise
        self.assertEqual(resp.data["currency"], "INR")

        # Payment record stored in PENDING status
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_method, "STRIPE")
        self.assertEqual(payment.payment_status, "PENDING")
        self.assertEqual(payment.stripe_session_id, "cs_test_session_abc123")
        self.assertEqual(self.order.status, "PENDING")  # Order must not be marked paid yet

        # Verify call arguments
        mock_session_create.assert_called_once()
        call_kwargs = mock_session_create.call_args.kwargs
        self.assertEqual(call_kwargs["client_reference_id"], str(self.order.id))
        self.assertEqual(call_kwargs["metadata"]["order_id"], str(self.order.id))
        self.assertEqual(call_kwargs["metadata"]["user_id"], str(self.customer.id))
        self.assertEqual(call_kwargs["line_items"][0]["price_data"]["unit_amount"], 150000)
        self.assertEqual(call_kwargs["line_items"][0]["price_data"]["currency"], "inr")

    # --- 2. Zero-decimal and custom currency handling ---

    @patch("stripe.checkout.Session.create")
    def test_stripe_zero_decimal_currency(self, mock_session_create):
        """Zero-decimal currency (e.g. JPY) does not multiply by 100."""
        mock_session_create.return_value = MagicMock(
            id="cs_test_jpy",
            url="https://checkout.stripe.com/pay/jpy",
        )

        with override_settings(
            STRIPE_SECRET_KEY=self.mock_secret_key,
            STRIPE_CURRENCY="jpy",
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["amount_subunits"], 1500)  # JPY has 0 decimals
        self.assertEqual(resp.data["currency"], "JPY")

    # --- 3. Missing or invalid configuration fails safely ---

    def test_stripe_missing_configuration_fails_safely(self):
        """When STRIPE_SECRET_KEY is empty, request fails with 400 error."""
        with override_settings(STRIPE_SECRET_KEY=""):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Stripe payment gateway is not configured", str(resp.data))

    # --- 4. Unauthenticated request rejected ---

    def test_unauthenticated_request_rejected(self):
        """Anonymous requests must be rejected with 401 Unauthorized."""
        anon_client = APIClient()
        resp = anon_client.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "STRIPE"},
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- 5. Attempt to pay for another user's order rejected ---

    def test_cannot_pay_for_another_users_order(self):
        """Customer cannot initiate payment for another customer's order."""
        with override_settings(STRIPE_SECRET_KEY=self.mock_secret_key):
            resp = self.client_other.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Order not found", str(resp.data))

    # --- 6. Duplicate payment request when order already paid ---

    def test_cannot_pay_for_already_paid_order(self):
        """Order with existing SUCCESS payment cannot initiate a new session."""
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_already_paid_123",
        )
        self.order.status = "PROCESSING"
        self.order.save(update_fields=["status"])

        with override_settings(STRIPE_SECRET_KEY=self.mock_secret_key):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Payment has already been completed", str(resp.data))

    # --- 7. Webhook: Invalid signature rejected ---

    @patch("stripe.Webhook.construct_event")
    def test_webhook_invalid_signature_rejected(self, mock_construct_event):
        """Webhook with invalid signature returns 400 Bad Request."""
        mock_construct_event.side_effect = stripe.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )

        with override_settings(STRIPE_WEBHOOK_SECRET=self.mock_webhook_secret):
            client = APIClient()
            resp = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps({"type": "checkout.session.completed"}),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="invalid_signature_header",
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid webhook signature", str(resp.data))

    # --- 8. Webhook: Missing webhook secret in settings ---

    def test_webhook_missing_secret_returns_503(self):
        """Webhook endpoint returns 503 if STRIPE_WEBHOOK_SECRET is not configured."""
        with override_settings(STRIPE_WEBHOOK_SECRET=""):
            client = APIClient()
            resp = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps({"type": "test"}),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="mock_sig",
            )
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    # --- 9. Webhook: Successful payment webhook transitions order and payment ---

    @patch("stripe.Webhook.construct_event")
    def test_webhook_successful_checkout_session_completed(self, mock_construct_event):
        """Webhook marks payment SUCCESS and order PROCESSING without deducting stock again."""
        initial_stock = self.product.stock

        mock_event = {
            "id": "evt_test_success_123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session_999",
                    "payment_intent": "pi_test_intent_999",
                    "payment_status": "paid",
                    "mode": "payment",
                    "currency": "inr",
                    "amount_total": 150000,
                    "client_reference_id": str(self.order.id),
                    "metadata": {
                        "order_id": str(self.order.id),
                        "user_id": str(self.customer.id),
                    },
                }
            },
        }
        mock_construct_event.return_value = mock_event

        with override_settings(
            STRIPE_WEBHOOK_SECRET=self.mock_webhook_secret,
            STRIPE_CURRENCY="inr",
        ):
            client = APIClient()
            resp = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps(mock_event),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="valid_sig",
            )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Order transitions from PENDING to PROCESSING
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")

        # Payment record is SUCCESS with transaction id
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_status, "SUCCESS")
        self.assertEqual(payment.transaction_id, "pi_test_intent_999")
        self.assertEqual(payment.stripe_session_id, "cs_test_session_999")
        self.assertIsNotNone(payment.paid_at)

        # Inventory must NOT be deducted twice
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, initial_stock)

        # Webhook event ID recorded for deduplication
        self.assertTrue(
            StripeWebhookEvent.objects.filter(event_id="evt_test_success_123").exists()
        )

    # --- 10. Webhook: Idempotent duplicate event processing ---

    @patch("stripe.Webhook.construct_event")
    def test_webhook_duplicate_event_is_idempotent(self, mock_construct_event):
        """Repeated webhook delivery of the same event returns 200 without duplicate action."""
        mock_event = {
            "id": "evt_duplicate_test_456",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_dup",
                    "payment_intent": "pi_test_dup",
                    "payment_status": "paid",
                    "currency": "inr",
                    "amount_total": 150000,
                    "metadata": {"order_id": str(self.order.id)},
                }
            },
        }
        mock_construct_event.return_value = mock_event

        with override_settings(
            STRIPE_WEBHOOK_SECRET=self.mock_webhook_secret,
            STRIPE_CURRENCY="inr",
        ):
            client = APIClient()
            # First delivery
            resp1 = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps(mock_event),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="valid_sig",
            )
            self.assertEqual(resp1.status_code, status.HTTP_200_OK)

            # Second delivery (replay / retry)
            resp2 = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps(mock_event),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="valid_sig",
            )
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            self.assertEqual(resp2.data["detail"], "Event already processed.")

    # --- 11. Webhook: Amount or currency mismatch rejected ---

    @patch("stripe.Webhook.construct_event")
    def test_webhook_amount_mismatch_rejected(self, mock_construct_event):
        """Webhook with spoofed/altered amount is rejected and does not mark order paid."""
        mock_event = {
            "id": "evt_mismatch_amount",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_mismatch",
                    "payment_status": "paid",
                    "currency": "inr",
                    "amount_total": 100,  # ₹1.00 instead of ₹1500.00
                    "metadata": {"order_id": str(self.order.id)},
                }
            },
        }
        mock_construct_event.return_value = mock_event

        with override_settings(
            STRIPE_WEBHOOK_SECRET=self.mock_webhook_secret,
            STRIPE_CURRENCY="inr",
        ):
            client = APIClient()
            resp = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps(mock_event),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="valid_sig",
            )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Amount or currency mismatch", str(resp.data))

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")

    # --- 12. Webhook: Session expired marks payment FAILED ---

    @patch("stripe.Webhook.construct_event")
    def test_webhook_session_expired_marks_pending_payment_failed(self, mock_construct_event):
        """Session expired event marks pending payment record as FAILED."""
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="PENDING",
            amount=self.order.total_price,
            stripe_session_id="cs_expired_test",
        )

        mock_event = {
            "id": "evt_session_expired",
            "type": "checkout.session.expired",
            "data": {
                "object": {
                    "id": "cs_expired_test",
                    "metadata": {"order_id": str(self.order.id)},
                }
            },
        }
        mock_construct_event.return_value = mock_event

        with override_settings(STRIPE_WEBHOOK_SECRET=self.mock_webhook_secret):
            client = APIClient()
            resp = client.post(
                "/api/v1/payments/stripe/webhook/",
                data=json.dumps(mock_event),
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="valid_sig",
            )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_status, "FAILED")

    # --- 13. Direct safe recovery via session status endpoint ---

    @patch("stripe.checkout.Session.retrieve")
    def test_direct_session_status_safe_recovery(self, mock_session_retrieve):
        """
        When customer returns from Stripe before webhook arrives,
        status endpoint polls Stripe directly and finalizes payment safely.
        """
        Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="PENDING",
            amount=self.order.total_price,
            stripe_session_id="cs_recovery_test",
        )

        mock_session_retrieve.return_value = {
            "id": "cs_recovery_test",
            "payment_status": "paid",
            "client_reference_id": str(self.order.id),
            "payment_intent": "pi_recovery_123",
            "amount_total": 150000,
            "currency": "inr",
        }

        with override_settings(
            STRIPE_SECRET_KEY=self.mock_secret_key,
            STRIPE_CURRENCY="inr",
        ):
            resp = self.client_customer.get(
                f"/api/v1/payments/orders/{self.order.id}/stripe/status/?session_id=cs_recovery_test"
            )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "SUCCESS")
        self.assertEqual(resp.data["transaction_id"], "pi_recovery_123")

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")

        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_status, "SUCCESS")

    # --- 14. Status endpoint rejects another customer's order ---

    def test_status_endpoint_rejects_cross_user_access(self):
        """Customer cannot check or verify another customer's order status."""
        with override_settings(STRIPE_SECRET_KEY=self.mock_secret_key):
            resp = self.client_other.get(
                f"/api/v1/payments/orders/{self.order.id}/stripe/status/?session_id=cs_test"
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Order not found", str(resp.data))

    # --- 15. Payment config endpoint reports Stripe enabled ---

    def test_payment_config_endpoint_reports_stripe(self):
        """Payment config endpoint accurately reports Stripe availability and publishable key."""
        with override_settings(
            STRIPE_SECRET_KEY=self.mock_secret_key,
            STRIPE_PUBLISHABLE_KEY=self.mock_pub_key,
            STRIPE_CURRENCY="inr",
        ):
            resp = self.client_customer.get("/api/v1/payments/config/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data["stripe_enabled"])
            self.assertEqual(resp.data["stripe_publishable_key"], self.mock_pub_key)
            self.assertEqual(resp.data["stripe_currency"], "INR")

