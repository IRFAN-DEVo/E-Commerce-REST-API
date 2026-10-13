from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import TestCase

from notifications.models import Notification
from orders.models import Order
from payments.models import Payment

User = get_user_model()


class PaymentNotificationSignalTests(TestCase):
    """
    Tests for payment notification signals and on_commit behavior.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="buyer_notify",
            email="buyer@test.com",
            password="Password123!",
        )
        self.order = Order.objects.create(
            user=self.user,
            total_price=Decimal("150.00"),
            status="PENDING",
        )
        self.payment = Payment.objects.create(
            order=self.order,
            payment_method="COD",
            payment_status=Payment.STATUS_PENDING,
            amount=Decimal("150.00"),
        )

    def test_payment_status_update_to_success_creates_notification(self):
        """
        Transitioning payment to SUCCESS triggers on_commit callback and creates notification.
        """
        with self.captureOnCommitCallbacks(execute=True):
            self.payment.payment_status = Payment.STATUS_SUCCESS
            self.payment.save()

        notification = Notification.objects.filter(
            user=self.user,
            order=self.order,
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        ).first()

        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "Payment Successful")
        self.assertIn(str(self.order.id), notification.message)
        # Ensure no secrets or credentials leaked in message
        self.assertNotIn("password", notification.message.lower())
        self.assertNotIn("token", notification.message.lower())

    def test_payment_failed_does_not_create_success_notification(self):
        """
        Non-SUCCESS statuses (e.g. FAILED, PENDING) must not trigger payment success notification.
        """
        with self.captureOnCommitCallbacks(execute=True):
            self.payment.payment_status = Payment.STATUS_FAILED
            self.payment.save()

        count = Notification.objects.filter(
            user=self.user,
            order=self.order,
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        ).count()
        self.assertEqual(count, 0)

    def test_repeated_signal_execution_prevents_duplicate_notifications(self):
        """
        Triggering the signal multiple times does not produce duplicate notifications.
        """
        with self.captureOnCommitCallbacks(execute=True):
            self.payment.payment_status = Payment.STATUS_SUCCESS
            self.payment.save()

        with self.captureOnCommitCallbacks(execute=True):
            # Save again with same status
            self.payment.save()

        count = Notification.objects.filter(
            user=self.user,
            order=self.order,
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        ).count()
        self.assertEqual(count, 1)

    def test_transaction_rollback_does_not_send_notification(self):
        """
        When a transaction rolls back, on_commit callbacks must not execute.
        """
        initial_count = Notification.objects.filter(
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS
        ).count()

        try:
            with transaction.atomic():
                self.payment.payment_status = Payment.STATUS_SUCCESS
                self.payment.save()
                raise RuntimeError("Simulated transaction failure")
        except RuntimeError:
            pass

        final_count = Notification.objects.filter(
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS
        ).count()
        self.assertEqual(initial_count, final_count)

    def test_signal_handles_missing_order_or_user_gracefully(self):
        """
        If order has no user or payment has no related order, the signal handles it without raising exceptions.
        """
        # Create unlinked mock payment instance without order
        orphan_payment = Payment(
            payment_method="COD",
            payment_status=Payment.STATUS_SUCCESS,
            amount=Decimal("50.00"),
        )
        orphan_payment.id = 99999
        # Does not crash when order is missing
        with self.captureOnCommitCallbacks(execute=True):
            # Directly call signal handler with orphan
            from notifications.signals import create_payment_success_notification
            create_payment_success_notification(
                sender=Payment,
                instance=orphan_payment,
                created=False,
            )
