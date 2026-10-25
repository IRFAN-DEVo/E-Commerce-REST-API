import logging

from django.conf import settings
from django.utils import timezone
from django.db import transaction

import razorpay

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import extend_schema

from orders.models import Order
from payments.models import Payment

from .serializers import (
    PaymentSerializer,
    UpdatePaymentStatusSerializer,
    CreatePaymentRequestSerializer,
    RazorpayPaymentVerifySerializer,
    PaymentConfigSerializer,
)

from payments.permissions import IsOwner

logger = logging.getLogger(__name__)



@extend_schema(
    tags=["Payments"],
    summary="Create Payment",
    description="Creates a payment for the authenticated user's order.",
    request=CreatePaymentRequestSerializer,
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

        if (
            order.status in ("PROCESSING", "SHIPPED", "DELIVERED")
            or Payment.objects.filter(order=order, payment_status="SUCCESS").exists()
        ):
            raise ValidationError(
                "Payment has already been completed for this order."
            )

        payment_method = request.data.get(
            "payment_method"
        )

        if payment_method == "STRIPE":
            raise ValidationError(
                "STRIPE payment gateway is currently inactive. "
                "Only Cash on Delivery (COD) and Razorpay are supported."
            )

        if payment_method not in ("COD", "RAZORPAY"):
            raise ValidationError(
                "Invalid payment method."
            )

        if payment_method == "COD":
            if Payment.objects.filter(order=order).exists():
                raise ValidationError(
                    "Payment already exists for this order."
                )

            payment = Payment.objects.create(
                order=order,
                payment_method="COD",
                payment_status="PENDING",
                amount=order.total_price,
            )

            serializer = PaymentSerializer(payment)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )

        # RAZORPAY flow
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()

        # Safe diagnostic (never prints credential values)
        print(
            f"[RAZORPAY DIAGNOSTIC] Key ID configured: {bool(key_id)} | "
            f"Key Secret configured: {bool(key_secret)} | "
            f"Key ID starts with 'rzp_test_': {key_id.startswith('rzp_test_')}"
        )

        if not key_id or not key_secret:
            raise ValidationError(
                "Razorpay payment gateway is not configured."
            )

        amount_in_paise = int(round(order.total_price * 100))
        if amount_in_paise <= 0:
            raise ValidationError(
                "Invalid order amount for payment."
            )

        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            razorpay_order = client.order.create(
                {
                    "amount": amount_in_paise,
                    "currency": "INR",
                    "receipt": f"order_{order.id}",
                    "notes": {
                        "order_id": str(order.id),
                        "user_id": str(request.user.id),
                    },
                }
            )
        except Exception as exc:
            logger.error(
                "Razorpay order creation failed for order %s: %s",
                order.id,
                str(exc),
            )
            raise ValidationError(
                "Failed to initiate payment with Razorpay. Please try again."
            )

        # Create or update pending payment record for retry idempotency
        existing_payment = Payment.objects.filter(order=order).first()
        if existing_payment:
            payment = existing_payment
            payment.payment_method = "RAZORPAY"
            payment.payment_status = "PENDING"
            payment.amount = order.total_price
            payment.save(
                update_fields=[
                    "payment_method",
                    "payment_status",
                    "amount",
                    "updated_at",
                ]
            )
        else:
            payment = Payment.objects.create(
                order=order,
                payment_method="RAZORPAY",
                payment_status="PENDING",
                amount=order.total_price,
            )

        # Prefill details from shipping address or customer profile
        customer_name = ""
        customer_phone = ""
        try:
            shipping = order.shipping_address
            customer_name = shipping.full_name
            customer_phone = shipping.phone
        except Exception:
            pass

        if not customer_name:
            customer_name = request.user.get_full_name() or request.user.username
        customer_email = request.user.email or ""

        return Response(
            {
                "payment_id": payment.id,
                "order_id": order.id,
                "razorpay_order_id": razorpay_order["id"],
                "razorpay_key_id": key_id,
                "amount": str(payment.amount),
                "amount_paise": amount_in_paise,
                "currency": "INR",
                "customer": {
                    "name": customer_name,
                    "email": customer_email,
                    "contact": customer_phone,
                },
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Payments"],
    summary="Verify Razorpay Payment",
    description="Verifies the Razorpay payment cryptographic signature and transitions order to paid/processing state.",
    request=RazorpayPaymentVerifySerializer,
)
class RazorpayVerifyPaymentView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id=None):
        serializer = RazorpayPaymentVerifySerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        target_order_id = serializer.validated_data["order_id"]
        if order_id and int(order_id) != int(target_order_id):
            raise ValidationError("Order ID mismatch between URL and payload.")

        razorpay_order_id = serializer.validated_data["razorpay_order_id"]
        razorpay_payment_id = serializer.validated_data["razorpay_payment_id"]
        razorpay_signature = serializer.validated_data["razorpay_signature"]

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()

        if not key_id or not key_secret:
            raise ValidationError(
                "Razorpay payment gateway is not configured."
            )

        try:
            order = (
                Order.objects
                .select_for_update()
                .get(
                    id=target_order_id,
                    user=request.user,
                )
            )
        except Order.DoesNotExist:
            raise ValidationError("Order not found.")

        if order.status == "CANCELLED":
            raise ValidationError("Cannot verify payment for a cancelled order.")

        try:
            payment = (
                Payment.objects
                .select_for_update()
                .get(order=order)
            )
        except Payment.DoesNotExist:
            raise ValidationError("Payment record not found for this order.")

        # Idempotency check: if already verified as SUCCESS, return success
        if payment.payment_status == "SUCCESS":
            return Response(
                {
                    "detail": "Payment already verified successfully.",
                    "order_id": order.id,
                    "status": "SUCCESS",
                    "transaction_id": payment.transaction_id,
                },
                status=status.HTTP_200_OK,
            )

        client = razorpay.Client(auth=(key_id, key_secret))
        try:
            client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
        except razorpay.errors.SignatureVerificationError:
            logger.warning(
                "Razorpay signature mismatch for order %s (user %s)",
                order.id,
                request.user.id,
            )
            payment.payment_status = "FAILED"
            payment.save(update_fields=["payment_status", "updated_at"])
            return Response(
                {"detail": "Invalid payment signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.warning(
                "Unexpected error verifying signature for order %s: %s",
                order.id,
                str(exc),
            )
            payment.payment_status = "FAILED"
            payment.save(update_fields=["payment_status", "updated_at"])
            return Response(
                {"detail": "Payment verification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark payment successful and link transaction id
        payment.payment_status = "SUCCESS"
        payment.transaction_id = razorpay_payment_id
        payment.paid_at = timezone.now()
        payment.save(
            update_fields=[
                "payment_status",
                "transaction_id",
                "paid_at",
                "updated_at",
            ]
        )

        # Transition order state from PENDING to PROCESSING
        if order.status == "PENDING":
            order.status = "PROCESSING"
            order.save(update_fields=["status"])

        logger.info(
            "Razorpay payment confirmed successfully for order %s, payment_id %s",
            order.id,
            payment.id,
        )

        return Response(
            {
                "detail": "Payment verified successfully.",
                "order_id": order.id,
                "status": "SUCCESS",
                "transaction_id": razorpay_payment_id,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Payments"],
    summary="Payment Configuration",
    description="Returns public payment gateway availability configuration.",
    responses={200: PaymentConfigSerializer},
)
class PaymentConfigView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()
        razorpay_enabled = bool(key_id and key_secret)

        return Response(
            {
                "razorpay_enabled": razorpay_enabled,
                "razorpay_key_id": key_id if razorpay_enabled else "",
                "cod_enabled": True,
                "stripe_enabled": False,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Payments"],
    summary="Razorpay Webhook",
    description="Receives and processes asynchronous Razorpay webhooks.",
)
class RazorpayWebhookView(APIView):

    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "").strip()
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()

        if not webhook_secret or not key_id or not key_secret:
            return Response(
                {"detail": "Webhook handling is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        signature = (
            request.headers.get("X-Razorpay-Signature")
            or request.META.get("HTTP_X_RAZORPAY_SIGNATURE")
        )
        if not signature:
            return Response(
                {"detail": "Missing webhook signature header."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload_body = request.body.decode("utf-8")
        client = razorpay.Client(auth=(key_id, key_secret))
        try:
            client.utility.verify_webhook_signature(
                payload_body,
                signature,
                webhook_secret,
            )
        except Exception:
            logger.warning("Invalid Razorpay webhook signature received.")
            return Response(
                {"detail": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_data = request.data
        event_type = event_data.get("event")

        if event_type in ("order.paid", "payment.captured"):
            payment_entity = (
                event_data.get("payload", {})
                .get("payment", {})
                .get("entity", {})
            )
            notes = payment_entity.get("notes", {})
            order_id = notes.get("order_id")
            payment_id = payment_entity.get("id")

            if order_id:
                try:
                    order = Order.objects.select_for_update().get(id=int(order_id))
                    payment = Payment.objects.select_for_update().get(order=order)
                    if payment.payment_status != "SUCCESS":
                        payment.payment_status = "SUCCESS"
                        payment.transaction_id = payment_id
                        payment.paid_at = timezone.now()
                        payment.save(
                            update_fields=[
                                "payment_status",
                                "transaction_id",
                                "paid_at",
                                "updated_at",
                            ]
                        )
                        if order.status == "PENDING":
                            order.status = "PROCESSING"
                            order.save(update_fields=["status"])
                except Exception as exc:
                    logger.error(
                        "Error processing webhook for order %s: %s",
                        order_id,
                        exc,
                    )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)



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