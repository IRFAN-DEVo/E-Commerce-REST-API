import logging
import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from cart.models import Cart, CartItem
from orders.models import Order, OrderItem, ShippingAddress
from orders.email import send_order_cancellation_email
from coupons.models import CouponUsage
from products.models import Product
from payments.models import Payment
from payments.refund_service import process_order_refund

from .serializers import (OrderSerializer, CheckoutSerializer, CancelOrderRequestSerializer)

logger = logging.getLogger(__name__)


@extend_schema(
    tags=["Orders"],
    summary="Checkout",
    description="Creates an order from the authenticated user's cart.",
    request=CheckoutSerializer,
    responses={201: OrderSerializer},
)
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shipping_data = serializer.validated_data["shipping_address"]

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            raise ValidationError("Cart not found.")

        cart_items = list(
            CartItem.objects.filter(cart=cart)
            .select_related("product")
            .select_for_update()
        )

        if not cart_items:
            raise ValidationError("Your cart is empty.")

        # Lock products in deterministic ID order to avoid database deadlocks and overselling
        product_ids = sorted(list({item.product_id for item in cart_items}))
        locked_products = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=product_ids)
        }

        # Validate stock against locked records
        for item in cart_items:
            product = locked_products.get(item.product_id)
            if not product or not product.is_available:
                raise ValidationError(
                    f"{item.product.name} is currently unavailable."
                )

            if product.stock < item.quantity:
                raise ValidationError(
                    f"{product.name} has only {product.stock} item(s) left."
                )

        # Create Order
        order = Order.objects.create(
            user=request.user,
            status="PENDING",
            total_price=0,
        )

        # Create Shipping Address
        ShippingAddress.objects.create(
            order=order,
            full_name=shipping_data["full_name"],
            phone=shipping_data["phone"],
            address=shipping_data["address"],
            city=shipping_data["city"],
            state=shipping_data["state"],
            postal_code=shipping_data["postal_code"],
            country=shipping_data["country"],
        )

        total = 0

        # Create Order Items and atomically deduct stock
        for item in cart_items:
            product = locked_products[item.product_id]

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                price=product.price,
            )

            total += product.price * item.quantity

            product.stock -= item.quantity
            product.save(update_fields=["stock"])

        order.total_price = total
        order.save(update_fields=["total_price"])

        # Retain cart items until payment is confirmed (COD placed or online payment verified)
        # Cart items are cleared upon payment creation or verification in the payments app

        serializer = OrderSerializer(order)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Orders"],
    summary="My Orders",
    description="Returns all orders belonging to the authenticated user.",
    responses={200: OrderSerializer(many=True)},
)
class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items__product",
            )
            .order_by("-created_at")
        )


@extend_schema(
    tags=["Orders"],
    summary="Order Details",
    description="Returns details of a specific order belonging to the authenticated user.",
    parameters=[
        OpenApiParameter(
            name="pk",
            type=int,
            location=OpenApiParameter.PATH,
            description="Order ID.",
        ),
    ],
    responses={200: OrderSerializer},
)
class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items__product",
            )
        )



@extend_schema(
    tags=["Orders"],
    summary="Cancel Order",
    description="Cancels an eligible customer order within the 24-hour window.",
    parameters=[
        OpenApiParameter(
            name="pk",
            type=int,
            location=OpenApiParameter.PATH,
            description="Order ID.",
        ),
    ],
    responses={200: None},
)
class CancelOrderView(APIView):
    """
    Securely cancels an eligible customer order within the 24-hour placement window.
    Atomically restores inventory holding sorted product row locks, releases applied coupons,
    processes verified provider refunds for paid orders, and dispatches confirmation notifications.
    Supports both POST and PATCH methods.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        return self._cancel_order(request, pk)

    def patch(self, request, pk):
        return self._cancel_order(request, pk)

    def _cancel_order(self, request, pk):
        is_paid_order = False
        payment_to_refund = None
        reason = "Cancelled by customer."

        with transaction.atomic():
            try:
                order = (
                    Order.objects
                    .select_for_update()
                    .prefetch_related("items__product")
                    .get(
                        pk=pk,
                        user=request.user,
                    )
                )
            except Order.DoesNotExist:
                raise ValidationError("Order not found.")

            # Evaluate cancellation eligibility against authoritative backend rules
            can_cancel, ineligibility_reason = order.get_cancellation_eligibility()
            if not can_cancel:
                raise ValidationError(ineligibility_reason)

            payment = Payment.objects.select_for_update().filter(order=order).first()

            serializer = CancelOrderRequestSerializer(data=request.data or {})
            serializer.is_valid()
            reason = serializer.validated_data.get("reason", "").strip() or "Cancelled by customer."

            # Atomically restore stock holding row locks in sorted order
            order_items = list(order.items.all())
            product_ids = sorted(list({item.product_id for item in order_items}))
            locked_products = {
                p.id: p
                for p in Product.objects.select_for_update().filter(id__in=product_ids)
            }
            for item in order_items:
                product = locked_products.get(item.product_id)
                if product:
                    product.stock += item.quantity
                    product.save(update_fields=["stock"])

            # Release coupon usage so customer can reuse the coupon
            CouponUsage.objects.filter(order=order).delete()

            if payment:
                if payment.payment_status == "SUCCESS":
                    is_paid_order = True
                    payment_to_refund = payment
                    payment.refund_status = "PENDING"
                    payment.refund_amount = payment.amount
                    payment.save(update_fields=["refund_status", "refund_amount", "updated_at"])
                elif payment.payment_status == "PENDING":
                    # Invalidate active unpaid Stripe Checkout Session if present
                    if payment.payment_method == "STRIPE" and payment.stripe_session_id:
                        try:
                            secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
                            if secret_key:
                                stripe.api_key = secret_key
                                stripe.checkout.Session.expire(payment.stripe_session_id)
                        except Exception:
                            pass

                    payment.payment_status = "FAILED"
                    payment.refund_status = "NOT_APPLICABLE"
                    payment.save(update_fields=["payment_status", "refund_status", "updated_at"])

            # Update order status, timestamp, and cancellation reason
            order.status = "CANCELLED"
            order.cancelled_at = timezone.now()
            order.cancellation_reason = reason
            order.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])

        # Execute provider refund outside the DB row lock to prevent long connection holding
        if is_paid_order and payment_to_refund:
            try:
                refund_status, refund_id, refund_amt = process_order_refund(payment_to_refund)
                payment_to_refund.refresh_from_db()
                payment_to_refund.refund_status = refund_status
                if refund_id:
                    payment_to_refund.refund_id = refund_id
                if refund_amt:
                    payment_to_refund.refund_amount = refund_amt

                if refund_status == "COMPLETED":
                    payment_to_refund.payment_status = "REFUNDED"
                    payment_to_refund.refunded_at = timezone.now()
                    payment_to_refund.save(
                        update_fields=[
                            "refund_status",
                            "refund_id",
                            "refund_amount",
                            "payment_status",
                            "refunded_at",
                            "updated_at",
                        ]
                    )
                else:
                    payment_to_refund.save(
                        update_fields=[
                            "refund_status",
                            "refund_id",
                            "refund_amount",
                            "updated_at",
                        ]
                    )
            except Exception as exc:
                logger.error("Failed executing refund for cancelled order %s: %s", order.id, exc)

        # Dispatch order cancellation email
        transaction.on_commit(
            lambda: send_order_cancellation_email(order=order, reason=reason)
        )

        order.refresh_from_db()
        return Response(
            {
                "message": "Order cancelled successfully.",
                "detail": "Order cancelled successfully.",
                "order_id": order.id,
                "status": order.status,
                "cancelled_at": order.cancelled_at,
                "cancellation_reason": order.cancellation_reason,
                "order": OrderSerializer(order, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )
