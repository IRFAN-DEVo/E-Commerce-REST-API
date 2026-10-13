import logging

from django.utils import timezone
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import extend_schema

from orders.models import Order
from payments.models import Payment

from .serializers import (
    PaymentSerializer,
    UpdatePaymentStatusSerializer,
)

from payments.permissions import IsOwner

logger = logging.getLogger(__name__)


@extend_schema(
    tags=["Payments"],
    summary="Create Payment",
    description="Creates a payment for the authenticated user's order.",
)
class CreatePaymentView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):

        try:
            order = (
                Order.objects
                .select_for_update()
                .get(
                    id=order_id,
                    user=request.user,
                )
            )

        except Order.DoesNotExist:
            raise ValidationError(
                "Order not found."
            )

        if order.status == "CANCELLED":
            raise ValidationError(
                "Cancelled orders cannot be paid."
            )

        if Payment.objects.filter(order=order).exists():
            raise ValidationError(
                "Payment already exists for this order."
            )

        payment_method = request.data.get(
            "payment_method"
        )

        if payment_method in ("RAZORPAY", "STRIPE"):
            raise ValidationError(
                f"{payment_method} payment gateway is currently inactive. "
                "Only Cash on Delivery (COD) is supported."
            )

        if payment_method != "COD":
            raise ValidationError(
                "Invalid payment method."
            )

        payment = Payment.objects.create(
            order=order,
            payment_method=payment_method,
            payment_status="PENDING",
            amount=order.total_price,
        )

        serializer = PaymentSerializer(payment)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Payments"],
    summary="List Payments",
    description="Returns payments made by the authenticated user.",
)
class PaymentListView(generics.ListAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return Payment.objects.none()

        return (
            Payment.objects
            .filter(
                order__user=self.request.user
            )
            .select_related(
                "order"
            )
            .order_by(
                "-created_at"
            )
        )


@extend_schema(
    tags=["Payments"],
    summary="Payment Details",
    description="Returns details of a payment belonging to the authenticated user.",
)
class PaymentDetailView(generics.RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    lookup_field = "pk"
    queryset = Payment.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return Payment.objects.none()

        return (
            Payment.objects
            .filter(
                order__user=self.request.user
            )
            .select_related(
                "order"
            )
        )


@extend_schema(
    tags=["Payments"],
    summary="Update Payment Status",
    description="Allows the shop owner to update payment status.",
    request=UpdatePaymentStatusSerializer,
)
class UpdatePaymentStatusView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOwner,
    ]

    @transaction.atomic
    def patch(self, request, pk):

        try:
            payment = (
                Payment.objects
                .select_for_update()
                .select_related(
                    "order"
                )
                .get(
                    pk=pk
                )
            )

        except Payment.DoesNotExist:
            raise ValidationError(
                "Payment not found."
            )

        # Explicit object-level permission check
        self.check_object_permissions(request, payment)

        serializer = UpdatePaymentStatusSerializer(
            data=request.data,
            context={
                "payment": payment
            },
        )

        serializer.is_valid(
            raise_exception=True
        )


        new_status = serializer.validated_data[
            "payment_status"
        ]

        transaction_id = serializer.validated_data.get(
            "transaction_id"
        )


        current_status = payment.payment_status


        allowed_transitions = {

            "PENDING": {
                "SUCCESS",
                "FAILED",
            },

            "SUCCESS": {
                "REFUNDED",
            },

            "FAILED": set(),

            "REFUNDED": set(),
        }


        if new_status not in allowed_transitions[current_status]:

            raise ValidationError(
                f"Cannot change payment status from "
                f"{current_status} to {new_status}."
            )

        if new_status == "SUCCESS" and payment.order.status == "CANCELLED":
            raise ValidationError(
                "Cannot mark payment as successful for a cancelled order."
            )


        payment.payment_status = new_status


        if (
            new_status == "SUCCESS"
            and payment.paid_at is None
        ):
            payment.paid_at = timezone.now()


        if transaction_id:
            payment.transaction_id = transaction_id


        payment.save()

        # Synchronise order status with payment lifecycle
        order = payment.order
        if new_status == "SUCCESS" and order.status == "PENDING":
            order.status = "PROCESSING"
            order.save(update_fields=["status"])

        # Audit log
        logger.info(
            "Payment %s status changed %s -> %s by user %s (order %s)",
            payment.pk,
            current_status,
            new_status,
            request.user.pk,
            order.pk,
        )

        return Response(
            {
                "detail": "Payment status updated successfully."
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Payments"],
    summary="Admin List Payments",
    description="Returns all payments across the store (Admin only).",
    responses={200: PaymentSerializer(many=True)},
)
class AdminPaymentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.select_related("order__user").order_by("-created_at")


@extend_schema(
    tags=["Payments"],
    summary="Admin Payment Details",
    description="Returns details of any payment (Admin only).",
    responses={200: PaymentSerializer},
)
class AdminPaymentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = PaymentSerializer
    lookup_field = "pk"
    queryset = Payment.objects.select_related("order__user")