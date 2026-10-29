import hmac
import hashlib
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from orders.models import Order, OrderItem, ShippingAddress
from products.models import Product, Category, Brand
from payments.models import Payment

User = get_user_model()


class RazorpayPaymentIntegrationTests(TestCase):
    """
    Comprehensive tests for DjangoMart Razorpay Test Mode integration,
    verifying security, order creation, signature verification, stock protection,
    idempotency, and regression prevention.
    """

    def setUp(self):
        self.client_customer = APIClient()
        self.client_other = APIClient()

        # Customer 1 (Alice)
        self.customer = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="SecurePassword123!",
            is_email_verified=True,
        )
        self.client_customer.force_authenticate(user=self.customer)

        # Customer 2 (Bob)
        self.other_customer = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="SecurePassword123!",
            is_email_verified=True,
        )
        self.client_other.force_authenticate(user=self.other_customer)

        # Category, Brand, and Product
        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="AudioBrand")
        self.product = Product.objects.create(
            name="Wireless Headphones",
            price=Decimal("499.00"),
            stock=15,
            is_available=True,
            category=self.category,
            brand=self.brand,
        )


        # Order for Alice
        self.order = Order.objects.create(
            user=self.customer,
            status="PENDING",
            total_price=Decimal("499.00"),
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=Decimal("499.00"),
        )
        self.shipping_address = ShippingAddress.objects.create(
            order=self.order,
            full_name="Alice Smith",
            phone="9876543210",
            address="123 Tech Park",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="India",
        )

        self.test_key_id = "rzp_test_mockkey123"
        self.test_key_secret = "mocksecret456"

    def _generate_signature(self, order_id, payment_id, secret):
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    # --- 1. Razorpay Order Creation & Currency/Amount ---

    @patch("razorpay.Client")
    def test_razorpay_order_creation_success(self, mock_razorpay_client_class):
        """Creates Razorpay order with server-authoritative amount in paise and currency INR."""
        mock_client = MagicMock()
        mock_razorpay_client_class.return_value = mock_client
        mock_client.order.create.return_value = {
            "id": "order_mockrzp123",
            "amount": 49900,
            "currency": "INR",
            "status": "created",
        }

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )

            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            data = resp.data

            # Verify response fields
            self.assertEqual(data["order_id"], self.order.id)
            self.assertEqual(data["razorpay_order_id"], "order_mockrzp123")
            self.assertEqual(data["razorpay_key_id"], self.test_key_id)
            self.assertEqual(data["amount"], "499.00")  # Rupees
            self.assertEqual(data["amount_paise"], 49900)  # Paise
            self.assertEqual(data["currency"], "INR")
            self.assertEqual(data["customer"]["name"], "Alice Smith")
            self.assertEqual(data["customer"]["email"], "alice@example.com")
            self.assertEqual(data["customer"]["contact"], "9876543210")
            self.assertEqual(data["customer_name"], "Alice Smith")
            self.assertEqual(data["customer_email"], "alice@example.com")
            self.assertEqual(data["customer_phone"], "9876543210")

            # Verify mock called with paise and order ID note
            mock_client.order.create.assert_called_once_with(
                {
                    "amount": 49900,
                    "currency": "INR",
                    "receipt": f"order_{self.order.id}",
                    "notes": {
                        "order_id": str(self.order.id),
                        "user_id": str(self.customer.id),
                    },
                }
            )

            # Verify Payment record created in PENDING status
            payment = Payment.objects.get(order=self.order)
            self.assertEqual(payment.payment_method, "RAZORPAY")
            self.assertEqual(payment.payment_status, "PENDING")
            self.assertEqual(payment.amount, Decimal("499.00"))

    # --- 2. Missing Configuration ---

    def test_razorpay_order_creation_fails_when_unconfigured(self):
        """Fails safely with 400 when Razorpay keys are missing or blank."""
        with override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET=""):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Razorpay payment gateway is not configured.", str(resp.data))

    # --- 3. Cryptographic Signature Verification ---

    def test_signature_verification_success(self):
        """Authentic signature marks payment SUCCESS and transitions order to PROCESSING."""
        # Create pending payment
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        rzp_order_id = "order_rzp_test_123"
        rzp_payment_id = "pay_rzp_test_456"
        valid_signature = self._generate_signature(
            rzp_order_id, rzp_payment_id, self.test_key_secret
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_payment_id": rzp_payment_id,
                    "razorpay_signature": valid_signature,
                },
            )

            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data["status"], "SUCCESS")
            self.assertEqual(resp.data["transaction_id"], rzp_payment_id)

            payment.refresh_from_db()
            self.assertEqual(payment.payment_status, "SUCCESS")
            self.assertEqual(payment.transaction_id, rzp_payment_id)
            self.assertIsNotNone(payment.paid_at)

            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PROCESSING")

    def test_signature_verification_failure_with_tampered_signature(self):
        """Tampered or invalid signature returns 400 and marks payment FAILED."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": "order_rzp_test_123",
                    "razorpay_payment_id": "pay_rzp_test_456",
                    "razorpay_signature": "invalid_forged_signature_hex",
                },
            )

            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Invalid payment signature.", str(resp.data))

            payment.refresh_from_db()
            self.assertEqual(payment.payment_status, "FAILED")

            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PENDING")

    # --- 4. Unauthorized Access Protection ---

    def test_customer_cannot_initiate_payment_for_another_customers_order(self):
        """Bob cannot initiate payment for Alice's order."""
        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_other.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Order not found.", str(resp.data))

    def test_customer_cannot_verify_payment_for_another_customers_order(self):
        """Bob cannot verify payment for Alice's order."""
        Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )
        sig = self._generate_signature("order_1", "pay_1", self.test_key_secret)

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_other.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": "order_1",
                    "razorpay_payment_id": "pay_1",
                    "razorpay_signature": sig,
                },
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Order not found.", str(resp.data))

    # --- 5. Cancelled Orders & Already Paid Orders ---

    def test_payment_for_cancelled_order_rejected(self):
        """Cancelled orders cannot be initiated or verified for payment."""
        self.order.status = "CANCELLED"
        self.order.save(update_fields=["status"])

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Cancelled orders cannot be paid.", str(resp.data))

    def test_cannot_initiate_payment_for_already_successful_order(self):
        """Cannot re-initiate payment once an order is marked SUCCESS."""
        Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pay_existing_123",
            paid_at=timezone.now(),
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(
                "Payment has already been completed for this order.", str(resp.data)
            )

    # --- 6. Idempotency & Stock Deduction Protection ---

    def test_duplicate_verification_is_idempotent_and_does_not_deduct_stock(self):
        """Duplicate verification calls return 200 without repeated side effects or double stock deduction."""
        self.product.refresh_from_db()
        initial_stock = self.product.stock

        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        rzp_order_id = "order_rzp_dup_123"
        rzp_payment_id = "pay_rzp_dup_456"
        valid_signature = self._generate_signature(
            rzp_order_id, rzp_payment_id, self.test_key_secret
        )

        payload = {
            "order_id": self.order.id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_signature,
        }

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            # First verification
            resp1 = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/", payload
            )
            self.assertEqual(resp1.status_code, status.HTTP_200_OK)

            # Second (duplicate) verification
            resp2 = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/", payload
            )
            self.assertEqual(resp2.status_code, status.HTTP_200_OK)
            self.assertIn("already verified", resp2.data["detail"].lower())

            # Verify stock remains unchanged (stock deduction happens at checkout, never repeated)
            self.product.refresh_from_db()
            self.assertEqual(self.product.stock, initial_stock)

    # --- 7. Payment Retry Flow ---

    @patch("razorpay.Client")
    def test_payment_retry_updates_pending_payment_without_creating_duplicates(
        self, mock_razorpay_client_class
    ):
        """If user retries Razorpay payment, existing pending payment is updated rather than duplicating."""
        mock_client = MagicMock()
        mock_razorpay_client_class.return_value = mock_client
        mock_client.order.create.return_value = {
            "id": "order_mock_retry_999",
            "amount": 49900,
            "currency": "INR",
        }

        # User previously had a failed/pending attempt
        Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="FAILED",
            amount=self.order.total_price,
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "RAZORPAY"},
            )
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

            # Exactly one payment record exists for this order
            self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
            payment = Payment.objects.get(order=self.order)
            self.assertEqual(payment.payment_status, "PENDING")

    # --- 8. COD and Stripe Regressions ---

    def test_cod_flow_remains_active(self):
        """COD payment continues to work as before."""
        resp = self.client_customer.post(
            f"/api/v1/payments/orders/{self.order.id}/payments/",
            {"payment_method": "COD"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.payment_method, "COD")
        self.assertEqual(payment.payment_status, "PENDING")

    def test_stripe_disabled_when_not_configured(self):
        """Stripe is disabled and rejected with 400 when not configured."""
        with override_settings(STRIPE_SECRET_KEY=""):
            resp = self.client_customer.post(
                f"/api/v1/payments/orders/{self.order.id}/payments/",
                {"payment_method": "STRIPE"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Stripe payment gateway is not configured", str(resp.data))

    # --- 9. Payment Config Endpoint ---

    def test_payment_config_endpoint_reports_status(self):
        """Payment config endpoint accurately reports gateway configurations."""
        with override_settings(
            RAZORPAY_KEY_ID="",
            RAZORPAY_KEY_SECRET="",
            STRIPE_SECRET_KEY="",
        ):
            resp = self.client_customer.get("/api/v1/payments/config/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertFalse(resp.data["razorpay_enabled"])
            self.assertEqual(resp.data["razorpay_key_id"], "")
            self.assertTrue(resp.data["cod_enabled"])
            self.assertFalse(resp.data["stripe_enabled"])

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
            STRIPE_SECRET_KEY="sk_test_mock_123",
        ):
            resp = self.client_customer.get("/api/v1/payments/config/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data["razorpay_enabled"])
            self.assertEqual(resp.data["razorpay_key_id"], self.test_key_id)
            self.assertTrue(resp.data["stripe_enabled"])

    # --- 10. UPI Payment Flows ---

    def test_upi_payment_signature_verification_success(self):
        """Verifies successful UPI payment (e.g. success@razorpay VPA) transitions order to PROCESSING."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        rzp_order_id = "order_upi_rzp_789"
        upi_payment_id = "pay_upi_success_456"
        valid_signature = self._generate_signature(
            rzp_order_id, upi_payment_id, self.test_key_secret
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": rzp_order_id,
                    "razorpay_payment_id": upi_payment_id,
                    "razorpay_signature": valid_signature,
                },
            )

            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data["status"], "SUCCESS")
            self.assertEqual(resp.data["transaction_id"], upi_payment_id)

            payment.refresh_from_db()
            self.assertEqual(payment.payment_status, "SUCCESS")
            self.assertEqual(payment.transaction_id, upi_payment_id)

            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PROCESSING")

    def test_upi_payment_tampered_signature_rejected(self):
        """Verifies tampered signature for UPI payment is rejected and marks payment FAILED."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": "order_upi_fake",
                    "razorpay_payment_id": "pay_upi_fake",
                    "razorpay_signature": "invalid_forged_upi_signature",
                },
            )

            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            payment.refresh_from_db()
            self.assertEqual(payment.payment_status, "FAILED")
            self.order.refresh_from_db()
            self.assertEqual(self.order.status, "PENDING")

    def test_upi_duplicate_verification_is_idempotent(self):
        """Verifies duplicate verification of an already-verified UPI payment returns 200 idempotently."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pay_upi_success_already",
        )
        self.order.status = "PROCESSING"
        self.order.save()

        with override_settings(
            RAZORPAY_KEY_ID=self.test_key_id,
            RAZORPAY_KEY_SECRET=self.test_key_secret,
        ):
            resp = self.client_customer.post(
                "/api/v1/payments/razorpay/verify/",
                {
                    "order_id": self.order.id,
                    "razorpay_order_id": "order_upi_prev",
                    "razorpay_payment_id": "pay_upi_success_already",
                    "razorpay_signature": "any_signature_because_idempotent",
                },
            )

            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data["detail"], "Payment already verified successfully.")
            self.assertEqual(resp.data["status"], "SUCCESS")

