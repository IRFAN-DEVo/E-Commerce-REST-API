import logging
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification
from orders.models import Order
from payments.models import Payment


logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(
    post_save,
    sender=User,
    dispatch_uid="create_welcome_notification",
)
def create_welcome_notification(sender, instance, created, **kwargs):
    """
    Create welcome notification for new users after transaction commits.
    """
    if created:
        user_id = instance.id

        def send_welcome():
            try:
                Notification.objects.get_or_create(
                    user_id=user_id,
                    notification_type=Notification.NotificationType.WELCOME,
                    defaults={
                        "title": "Welcome!",
                        "message": (
                            "Welcome to our store! "
                            "We're excited to have you here."
                        ),
                    },
                )
            except Exception as exc:
                logger.exception(
                    "Failed to create welcome notification for user %s: %s",
                    user_id,
                    exc,
                )

        transaction.on_commit(send_welcome)


@receiver(
    post_save,
    sender=Order,
    dispatch_uid="create_order_notification",
)
def create_order_notification(sender, instance, created, **kwargs):
    """
    Create notification when order is created after transaction commits.
    """
    if created:
        user = getattr(instance, "user", None)
        if not user:
            return

        order_id = instance.id
        user_id = user.id

        def send_order_placed():
            try:
                Notification.objects.get_or_create(
                    user_id=user_id,
                    order_id=order_id,
                    notification_type=Notification.NotificationType.ORDER_PLACED,
                    defaults={
                        "title": "Order Placed",
                        "message": (
                            f"Your order #{order_id} "
                            "has been placed successfully."
                        ),
                    },
                )
            except Exception as exc:
                logger.exception(
                    "Failed to create order placed notification for order %s: %s",
                    order_id,
                    exc,
                )

        transaction.on_commit(send_order_placed)


@receiver(
    post_save,
    sender=Payment,
    dispatch_uid="create_payment_success_notification",
)
def create_payment_success_notification(
    sender,
    instance,
    created,
    **kwargs
):
    """
    Create notification when payment succeeds after transaction commits.
    Safely handles missing order/user, duplicate signals, and avoids recursive saves.
    """
    if instance.payment_status == Payment.STATUS_SUCCESS:
        order = getattr(instance, "order", None)
        if not order:
            return

        user = getattr(order, "user", None)
        if not user:
            return

        order_id = order.id
        user_id = user.id

        def send_payment_success():
            try:
                Notification.objects.get_or_create(
                    user_id=user_id,
                    order_id=order_id,
                    notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                    defaults={
                        "title": "Payment Successful",
                        "message": (
                            f"Payment for Order #{order_id} was successful."
                        ),
                    },
                )
            except Exception as exc:
                logger.exception(
                    "Failed to create payment success notification for order %s: %s",
                    order_id,
                    exc,
                )

        transaction.on_commit(send_payment_success)


@receiver(
    post_save,
    sender=Order,
    dispatch_uid="create_order_shipping_notification",
)
def create_shipping_notification(
    sender,
    instance,
    created,
    **kwargs
):
    """
    Create notification when order is shipped after transaction commits.
    """
    if not created and instance.status == "SHIPPED":
        user = getattr(instance, "user", None)
        if not user:
            return

        order_id = instance.id
        user_id = user.id

        def send_shipping():
            try:
                Notification.objects.get_or_create(
                    user_id=user_id,
                    order_id=order_id,
                    notification_type=Notification.NotificationType.ORDER_SHIPPED,
                    defaults={
                        "title": "Order Shipped",
                        "message": f"Your order #{order_id} has been shipped.",
                    },
                )
            except Exception as exc:
                logger.exception(
                    "Failed to create order shipped notification for order %s: %s",
                    order_id,
                    exc,
                )

        transaction.on_commit(send_shipping)


@receiver(
    post_save,
    sender=Order,
    dispatch_uid="create_order_delivery_notification",
)
def create_delivery_notification(
    sender,
    instance,
    created,
    **kwargs
):
    """
    Create notification when order is delivered after transaction commits.
    """
    if not created and instance.status == "DELIVERED":
        user = getattr(instance, "user", None)
        if not user:
            return

        order_id = instance.id
        user_id = user.id

        def send_delivered():
            try:
                Notification.objects.get_or_create(
                    user_id=user_id,
                    order_id=order_id,
                    notification_type=Notification.NotificationType.ORDER_DELIVERED,
                    defaults={
                        "title": "Order Delivered",
                        "message": f"Your order #{order_id} has been delivered.",
                    },
                )
            except Exception as exc:
                logger.exception(
                    "Failed to create order delivered notification for order %s: %s",
                    order_id,
                    exc,
                )

        transaction.on_commit(send_delivered)
