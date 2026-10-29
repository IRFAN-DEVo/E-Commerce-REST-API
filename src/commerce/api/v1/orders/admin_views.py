from orders.email import send_order_cancellation_email
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import extend_schema

from orders.models import Order
from coupons.models import CouponUsage
from products.models import Product
from payments.models import Payment

from .serializers import (
    OrderSerializer,
    UpdateOrderStatusSerializer,
)

from api.v1.products.permissions import IsOwner



@extend_schema(
    summary="Admin Order List",
    description="Returns all customer orders. Owner access only."
)
class AdminOrderListView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]


    def get(self, request):
        status_param = request.query_params.get("status")

        orders = (
            Order.objects
            .select_related(
                "user",
                "shipping_address",
                "payment",
            )
            .prefetch_related(
                "items__product"
            )
            .order_by(
                "-created_at"
            )
        )

        if status_param:
            orders = orders.filter(status=status_param)


        serializer = OrderSerializer(
            orders,
            many=True
        )


        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )



@extend_schema(
    summary="Admin Order Detail",
    description="Returns a single customer order. Owner access only."
)
class AdminOrderDetailView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]


    def get(self, request, pk):

        try:

            order = (
                Order.objects
                .select_related(
                    "user",
                    "shipping_address",
                    "payment",
                )
                .prefetch_related(
                    "items__product"
                )
                .get(
                    pk=pk
                )
            )


        except Order.DoesNotExist:

            raise ValidationError(
                "Order not found."
            )


        serializer = OrderSerializer(
            order
        )


        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )



@extend_schema(
    summary="Update Order Status",
    description="Updates order status. Owner access only.",
    request=UpdateOrderStatusSerializer,
)
class UpdateOrderStatusView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]


    @transaction.atomic
    def patch(self, request, pk):

        try:
            order = (
                Order.objects
                .select_for_update()
                .prefetch_related("items__product")
                .get(
                    pk=pk
                )
            )

        except Order.DoesNotExist:
            raise ValidationError(
                "Order not found."
            )

        payment = Payment.objects.filter(order=order).first()

        serializer = UpdateOrderStatusSerializer(
            order,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        new_status = serializer.validated_data.get("status")

        if new_status == "CANCELLED":
            if payment and payment.payment_status == "SUCCESS":
                raise ValidationError(
                    "Paid orders cannot be cancelled directly. Please refund the payment first."
                )

            # If cancelling from PENDING, atomically restore product stock and release coupon
            if order.status == "PENDING":
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

                CouponUsage.objects.filter(order=order).delete()

                if payment and payment.payment_status == "PENDING":
                    payment.payment_status = "FAILED"
                    payment.save(update_fields=["payment_status"])

        elif new_status == "DELIVERED":
            if payment and payment.payment_method == "COD" and payment.payment_status == "PENDING":
                payment.payment_status = "SUCCESS"
                payment.paid_at = timezone.now()
                payment.save(update_fields=["payment_status", "paid_at"])

        serializer.save()

        if new_status == "CANCELLED":
            transaction.on_commit(
                lambda: send_order_cancellation_email(order=order, reason="Cancelled by administrator.")
            )

        return Response(
            {
                "detail": "Order status updated successfully."
            },
            status=status.HTTP_200_OK
        )