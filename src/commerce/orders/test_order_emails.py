from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Order, OrderItem, ShippingAddress
from payments.models import Payment
from products.models import Product, Category, Brand
from orders.email import (
    send_order_confirmation_email,
    send_order_cancellation_email,
)

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="DjangoMart <irfancalicut7@gmail.com>",
)
class OrderEmailTests(TestCase):
    """
    Unit and integration tests for DjangoMart order confirmation and cancellation emails.
    """

    def setUp(self):
        mail.outbox.clear()
        cache.clear()

        self.user = User.objects.create_user(
            username="buyer_user",
            email="buyer@example.com",
            password="SecurePassword123!",
            first_name="John",
            last_name="Doe",
        )

        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="TechBrand")
        self.product = Product.objects.create(
            name="Wireless Headphones",
            description="High quality headphones",
            price=1500.00,
            stock=10,
            category=self.category,
            brand=self.brand,
        )

        self.order = Order.objects.create(
            user=self.user,
            status="PENDING",
            total_price=1500.00,
        )

        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=1500.00,
        )

        self.shipping = ShippingAddress.objects.create(
            order=self.order,
            full_name="John Doe",
            phone="9876543210",
            address="123 Market Street",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
        )

    def test_cod_order_confirmation_email_content(self):
        """COD confirmation email displays Pending payment status and never marks as paid."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status="PENDING",
            amount=self.order.total_price,
        )

        sent = send_order_confirmation_email(order=self.order, payment=payment)
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox[0]
        self.assertEqual(email.to, ["buyer@example.com"])
        self.assertIn("DjangoMart - Order #", email.subject)
        self.assertIn("[Order Received]", email.subject)

        # Body checks
        self.assertIn("Cash on Delivery (COD)", email.body)
        self.assertIn("Pending", email.body)
        self.assertIn("Wireless Headphones", email.body)
        self.assertIn("Rs.1,500.00", email.body)
        self.assertIn("123 Market Street", email.body)
        self.assertIn("support@djangomart.com", email.body)

    def test_paid_online_order_confirmation_email_content(self):
        """Paid online orders (Razorpay/Stripe) display Paid status and transaction ID."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="RAZORPAY",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pay_test_razorpay_12345",
        )

        sent = send_order_confirmation_email(order=self.order, payment=payment)
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox[0]
        self.assertIn("[Paid]", email.subject)
        self.assertIn("Razorpay", email.body)
        self.assertIn("Paid", email.body)
        self.assertIn("pay_test_razorpay_12345", email.body)

    def test_confirmation_email_idempotency_prevents_duplicate_send(self):
        """Multiple confirmation email triggers for same order only send once."""
        payment = Payment.objects.create(
            order=self.order,
            payment_method="STRIPE",
            payment_status="SUCCESS",
            amount=self.order.total_price,
            transaction_id="pi_stripe_test_12345",
        )

        # First trigger
        sent1 = send_order_confirmation_email(order=self.order, payment=payment)
        self.assertTrue(sent1)
        self.assertEqual(len(mail.outbox), 1)

        # Duplicate trigger (e.g. repeated webhook)
        sent2 = send_order_confirmation_email(order=self.order, payment=payment)
        self.assertFalse(sent2)
        self.assertEqual(len(mail.outbox), 1)

    def test_order_cancellation_email_content(self):
        """Cancellation email sends notification with order summary and return-to-stock notice."""
        sent = send_order_cancellation_email(order=self.order, reason="Customer changed mind")
        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox[0]
        self.assertEqual(email.to, ["buyer@example.com"])
        self.assertIn("Has Been Cancelled", email.subject)
        self.assertIn(f"Order #{self.order.id}", email.subject)
        self.assertIn("Wireless Headphones", email.body)
        self.assertIn("reserved stock has been returned", email.body)
        self.assertIn("support@djangomart.com", email.body)

    def test_cancellation_email_idempotency_prevents_duplicate_send(self):
        """Duplicate cancellation calls for same order only send once."""
        sent1 = send_order_cancellation_email(order=self.order)
        self.assertTrue(sent1)
        self.assertEqual(len(mail.outbox), 1)

        sent2 = send_order_cancellation_email(order=self.order)
        self.assertFalse(sent2)
        self.assertEqual(len(mail.outbox), 1)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="DjangoMart <irfancalicut7@gmail.com>",
)
class OrderEmailIntegrationViewsTests(APITestCase):
    """
    Integration tests testing API endpoints triggering emails:
    - Placing COD order sends confirmation email
    - Cancelling order sends cancellation email
    """

    def setUp(self):
        mail.outbox.clear()
        cache.clear()

        self.user = User.objects.create_user(
            username="shopper",
            email="shopper@example.com",
            password="SecureShopper123!",
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name="Books")
        self.brand = Brand.objects.create(name="PublisherBrand")
        self.product = Product.objects.create(
            name="Python Cookbook",
            description="Practical recipes for Python",
            price=800.00,
            stock=5,
            category=self.category,
            brand=self.brand,
        )

        self.order = Order.objects.create(
            user=self.user,
            status="PENDING",
            total_price=800.00,
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=800.00,
        )
        ShippingAddress.objects.create(
            order=self.order,
            full_name="Shopper Person",
            phone="9876543210",
            address="456 Elm St",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
        )

    def test_cod_payment_creation_triggers_email(self):
        """Creating COD payment via API triggers order confirmation email."""
        url = f"/api/v1/payments/orders/{self.order.id}/payments/"
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, {"payment_method": "COD"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ["shopper@example.com"])
        self.assertIn("DjangoMart - Order #", email.subject)
        self.assertIn("Cash on Delivery (COD)", email.body)

    def test_cancel_order_view_triggers_email(self):
        """Cancelling pending order via /api/v1/orders/orders/<pk>/cancel/ triggers cancellation email."""
        url = f"/api/v1/orders/orders/{self.order.id}/cancel/"
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ["shopper@example.com"])
        self.assertIn(f"Order #{self.order.id} Has Been Cancelled", email.subject)
        self.assertIn("Python Cookbook", email.body)
