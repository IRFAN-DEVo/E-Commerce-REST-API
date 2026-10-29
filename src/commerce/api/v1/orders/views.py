from django.db import transaction

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

from .serializers import (OrderSerializer,CheckoutSerializer)


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

        # Cancel and restore stock for any prior unpaid PENDING orders from this user
        existing_pending_orders = Order.objects.filter(user=request.user, status="PENDING")
        for old_order in existing_pending_orders:
            old_payment = Payment.objects.filter(order=old_order).first()
            if not old_payment or old_payment.payment_status != "SUCCESS":
                for old_item in old_order.items.select_related("product"):
                    old_item.product.stock += old_item.quantity
                    old_item.product.save(update_fields=["stock"])
                CouponUsage.objects.filter(order=old_order).delete()
                old_order.status = "CANCELLED"
                old_order.save(update_fields=["status"])

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
    description="Cancels a pending order belonging to the authenticated user.",
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
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):

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

        payment = Payment.objects.filter(order=order).first()

        if order.status != "PENDING":
            raise ValidationError(
                "Only pending orders can be cancelled."
            )

        # Prevent cancelling a successfully paid order
        if payment and payment.payment_status == "SUCCESS":
            raise ValidationError(
                "Paid orders cannot be cancelled."
            )

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

        # Release coupon usage so the customer can reuse the coupon
        CouponUsage.objects.filter(order=order).delete()

        # Update pending payment status if present
        if payment and payment.payment_status == "PENDING":
            payment.payment_status = "FAILED"
            payment.save(update_fields=["payment_status"])

        order.status = "CANCELLED"
        order.save(update_fields=["status"])

        # Send order cancellation email after transaction commit
        transaction.on_commit(
            lambda: send_order_cancellation_email(order=order)
        )

        return Response(
            {
                "message": "Order cancelled successfully."
            },
            status=status.HTTP_200_OK,
        )