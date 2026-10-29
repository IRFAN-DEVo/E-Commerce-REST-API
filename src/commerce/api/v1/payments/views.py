import logging

from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

import razorpay
import stripe

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import extend_schema

from orders.models import Order
from cart.models import CartItem
from payments.models import Payment, StripeWebhookEvent
from payments.stripe_utils import convert_to_stripe_subunits, get_stripe_currency

from .serializers import (
    PaymentSerializer,
    UpdatePaymentStatusSerializer,
    CreatePaymentRequestSerializer,
    RazorpayPaymentVerifySerializer,
    PaymentConfigSerializer,
)

from payments.permissions import IsOwner

logger = logging.getLogger(__name__)


def clear_cart_for_user(user):
    """
    Clears all cart items for the given user upon successful order placement or payment.
    """
    if user:
        try:
            CartItem.objects.filter(cart__user=user).delete()
        except Exception as exc:
            logger.error("Failed to clear cart for user %s: %s", getattr(user, "id", user), exc)



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

        if payment_method not in ("COD", "RAZORPAY", "STRIPE"):
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

            # Clear user cart on confirmed COD order placement
            clear_cart_for_user(order.user)

            serializer = PaymentSerializer(payment)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )

        if payment_method == "STRIPE":
            secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
            if not secret_key:
                raise ValidationError(
                    "Stripe payment gateway is not configured."
                )

            currency, amount_subunits = convert_to_stripe_subunits(
                order.total_price,
                getattr(settings, "STRIPE_CURRENCY", "inr")
            )

            frontend_url = (
                getattr(settings, "FRONTEND_URL", "").strip()
                or request.headers.get("Origin", "").strip()
                or "http://localhost:3000"
            ).rstrip("/")

            success_url = (
                f"{frontend_url}/orders/{order.id}"
                f"?payment_status=success&session_id={{CHECKOUT_SESSION_ID}}"
            )
            cancel_url = f"{frontend_url}/checkout?cancelled=true&order_id={order.id}"

            stripe.api_key = secret_key
            customer_email = request.user.email or None

            try:
                session = stripe.checkout.Session.create(
                    mode="payment",
                    client_reference_id=str(order.id),
                    customer_email=customer_email,
                    line_items=[
                        {
                            "price_data": {
                                "currency": currency,
                                "product_data": {
                                    "name": f"DjangoMart Order #{order.id}",
                                    "description": f"Payment for Order #{order.id}",
                                },
                                "unit_amount": amount_subunits,
                            },
                            "quantity": 1,
                        }
                    ],
                    metadata={
                        "order_id": str(order.id),
                        "user_id": str(request.user.id),
                    },
                    payment_intent_data={
                        "metadata": {
                            "order_id": str(order.id),
                            "user_id": str(request.user.id),
                        }
                    },
                    success_url=success_url,
                    cancel_url=cancel_url,
                )
            except Exception as exc:
                logger.error(
                    "Stripe Checkout Session creation failed for order %s: %s",
                    order.id,
                    str(exc),
                )
                raise ValidationError(
                    "Failed to initiate payment with Stripe. Please try again."
                )

            session_id = getattr(session, "id", None) or session.get("id")
            session_url = getattr(session, "url", None) or session.get("url")

            existing_payment = Payment.objects.filter(order=order).first()
            if existing_payment:
                payment = existing_payment
                payment.payment_method = "STRIPE"
                payment.payment_status = "PENDING"
                payment.amount = order.total_price
                payment.stripe_session_id = session_id
                payment.save(
                    update_fields=[
                        "payment_method",
                        "payment_status",
                        "amount",
                        "stripe_session_id",
                        "updated_at",
                    ]
                )
            else:
                payment = Payment.objects.create(
                    order=order,
                    payment_method="STRIPE",
                    payment_status="PENDING",
                    amount=order.total_price,
                    stripe_session_id=session_id,
                )

            publishable_key = getattr(
                settings,
                "STRIPE_PUBLISHABLE_KEY",
                getattr(settings, "STRIPE_PUBLIC_KEY", "")
            ).strip()

            return Response(
                {
                    "payment_id": payment.id,
                    "order_id": order.id,
                    "stripe_session_id": session_id,
                    "session_url": session_url,
                    "publishable_key": publishable_key,
                    "amount": str(payment.amount),
                    "amount_subunits": amount_subunits,
                    "currency": currency.upper(),
                },
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
        clear_cart_for_user(order.user)

        # Clear cart now that payment is verified
        clear_cart_for_user(order.user)

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

        stripe_secret = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
        stripe_pub = getattr(
            settings,
            "STRIPE_PUBLISHABLE_KEY",
            getattr(settings, "STRIPE_PUBLIC_KEY", "")
        ).strip()
        stripe_currency = getattr(settings, "STRIPE_CURRENCY", "inr").strip().upper()
        stripe_enabled = bool(stripe_secret)

        return Response(
            {
                "razorpay_enabled": razorpay_enabled,
                "razorpay_key_id": key_id if razorpay_enabled else "",
                "cod_enabled": True,
                "stripe_enabled": stripe_enabled,
                "stripe_publishable_key": stripe_pub if stripe_enabled else "",
                "stripe_currency": stripe_currency,
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
                        clear_cart_for_user(order.user)
                except Exception as exc:
                    logger.error(
                        "Error processing webhook for order %s: %s",
                        order_id,
                        exc,
                    )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
@extend_schema(
    tags=["Payments"],
    summary="Stripe Webhook",
    description="Receives and processes asynchronous Stripe webhooks securely with signature verification and deduplication.",
)
class StripeWebhookView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "").strip()
        if not webhook_secret:
            logger.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured.")
            return Response(
                {"detail": "Webhook handling is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        signature = (
            request.headers.get("Stripe-Signature")
            or request.META.get("HTTP_STRIPE_SIGNATURE")
        )
        if not signature:
            logger.warning("Missing Stripe-Signature header in webhook request.")
            return Response(
                {"detail": "Missing webhook signature header."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.body
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                webhook_secret,
            )
        except (ValueError, stripe.SignatureVerificationError) as exc:
            logger.warning("Invalid Stripe webhook signature: %s", str(exc))
            return Response(
                {"detail": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.error("Unexpected error validating Stripe webhook signature: %s", str(exc))
            return Response(
                {"detail": "Webhook verification error."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_id = event.get("id") if isinstance(event, dict) else getattr(event, "id", None)
        event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)

        if not event_id or not event_type:
            return Response(
                {"detail": "Malformed Stripe event payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reliable database-level deduplication:
        with transaction.atomic():
            event_record, created = StripeWebhookEvent.objects.get_or_create(
                event_id=event_id,
                defaults={"event_type": event_type},
            )
            if not created:
                logger.info(
                    "Stripe webhook event %s (%s) already processed. Returning 200 OK.",
                    event_id,
                    event_type,
                )
                return Response(
                    {"detail": "Event already processed."},
                    status=status.HTTP_200_OK,
                )

        data_object = (
            event.get("data", {}).get("object", {})
            if isinstance(event, dict)
            else getattr(getattr(event, "data", None), "object", {})
        )

        if event_type == "checkout.session.completed":
            return self._handle_checkout_session_completed(data_object)
        elif event_type == "checkout.session.expired":
            return self._handle_checkout_session_expired(data_object)
        elif event_type == "payment_intent.payment_failed":
            return self._handle_payment_intent_failed(data_object)

        return Response(
            {"detail": f"Event {event_type} received."},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def _handle_checkout_session_completed(self, session):
        metadata = (
            session.get("metadata")
            if isinstance(session, dict)
            else getattr(session, "metadata", {}) or {}
        )
        order_id = (
            (metadata.get("order_id") if isinstance(metadata, dict) else getattr(metadata, "order_id", None))
            or (session.get("client_reference_id") if isinstance(session, dict) else getattr(session, "client_reference_id", None))
        )

        if not order_id:
            logger.warning("Checkout session completed event missing order_id.")
            return Response(
                {"detail": "Missing order association metadata."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_status = (
            session.get("payment_status")
            if isinstance(session, dict)
            else getattr(session, "payment_status", None)
        )
        if payment_status != "paid":
            logger.info(
                "Checkout session %s payment_status is '%s', not 'paid'.",
                session.get("id") if isinstance(session, dict) else getattr(session, "id", None),
                payment_status,
            )
            return Response(
                {"detail": f"Payment status is {payment_status}."},
                status=status.HTTP_200_OK,
            )

        try:
            order = Order.objects.select_for_update().get(id=int(order_id))
        except (Order.DoesNotExist, ValueError):
            logger.warning("Order %s not found for checkout session.", order_id)
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate amount and currency against trusted server-side order calculation
        session_currency = (
            (session.get("currency") if isinstance(session, dict) else getattr(session, "currency", ""))
            or ""
        ).lower()
        amount_total = (
            session.get("amount_total")
            if isinstance(session, dict)
            else getattr(session, "amount_total", None)
        )

        expected_currency, expected_subunits = convert_to_stripe_subunits(
            order.total_price,
            getattr(settings, "STRIPE_CURRENCY", "inr")
        )

        if session_currency != expected_currency or int(amount_total) != expected_subunits:
            logger.warning(
                "Stripe amount/currency mismatch for order %s: expected %s %s, got %s %s",
                order.id,
                expected_currency,
                expected_subunits,
                session_currency,
                amount_total,
            )
            return Response(
                {"detail": "Amount or currency mismatch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == "CANCELLED":
            logger.warning("Payment received for cancelled order %s.", order.id)
            return Response(
                {"detail": "Order is cancelled."},
                status=status.HTTP_200_OK,
            )

        payment, _ = Payment.objects.select_for_update().get_or_create(
            order=order,
            defaults={
                "amount": order.total_price,
                "payment_method": "STRIPE",
                "payment_status": "PENDING",
            },
        )

        session_id = session.get("id") if isinstance(session, dict) else getattr(session, "id", None)
        payment_intent = (
            session.get("payment_intent")
            if isinstance(session, dict)
            else getattr(session, "payment_intent", None)
        )

        if payment.payment_status == "SUCCESS":
            logger.info("Payment for order %s is already marked SUCCESS.", order.id)
            return Response(
                {"detail": "Payment already confirmed."},
                status=status.HTTP_200_OK,
            )

        payment.payment_method = "STRIPE"
        payment.payment_status = "SUCCESS"
        payment.transaction_id = payment_intent or session_id
        payment.stripe_session_id = session_id
        payment.paid_at = timezone.now()
        payment.save(
            update_fields=[
                "payment_method",
                "payment_status",
                "transaction_id",
                "stripe_session_id",
                "paid_at",
                "updated_at",
            ]
        )

        if order.status == "PENDING":
            order.status = "PROCESSING"
            order.save(update_fields=["status"])
        clear_cart_for_user(order.user)

        logger.info(
            "Stripe payment confirmed for order %s, transaction %s",
            order.id,
            payment.transaction_id,
        )

        return Response(
            {"detail": "Payment processed successfully.", "order_id": order.id},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def _handle_checkout_session_expired(self, session):
        metadata = (
            session.get("metadata")
            if isinstance(session, dict)
            else getattr(session, "metadata", {}) or {}
        )
        order_id = (
            (metadata.get("order_id") if isinstance(metadata, dict) else getattr(metadata, "order_id", None))
            or (session.get("client_reference_id") if isinstance(session, dict) else getattr(session, "client_reference_id", None))
        )
        if order_id:
            try:
                payment = Payment.objects.filter(order_id=int(order_id), payment_status="PENDING").first()
                if payment:
                    payment.payment_status = "FAILED"
                    payment.save(update_fields=["payment_status", "updated_at"])
                    logger.info("Marked payment FAILED for expired session on order %s", order_id)
            except Exception:
                pass
        return Response({"detail": "Session expired recorded."}, status=status.HTTP_200_OK)

    @transaction.atomic
    def _handle_payment_intent_failed(self, pi):
        metadata = (
            pi.get("metadata")
            if isinstance(pi, dict)
            else getattr(pi, "metadata", {}) or {}
        )
        order_id = metadata.get("order_id") if isinstance(metadata, dict) else getattr(metadata, "order_id", None)
        if order_id:
            try:
                payment = Payment.objects.filter(order_id=int(order_id), payment_status="PENDING").first()
                if payment:
                    payment.payment_status = "FAILED"
                    payment.save(update_fields=["payment_status", "updated_at"])
                    logger.info("Marked payment FAILED for failed payment intent on order %s", order_id)
            except Exception:
                pass
        return Response({"detail": "Payment failure recorded."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Payments"],
    summary="Stripe Session Status",
    description="Retrieves trusted Stripe Checkout Session and payment verification status, enabling safe recovery if the customer returns before webhook execution finishes.",
)
class StripeSessionStatusView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request, order_id=None):
        target_order_id = order_id or request.query_params.get("order_id")
        if not target_order_id:
            raise ValidationError("Order ID is required.")

        try:
            order = Order.objects.select_for_update().get(
                id=int(target_order_id),
                user=request.user,
            )
        except (Order.DoesNotExist, ValueError):
            raise ValidationError("Order not found.")

        payment = Payment.objects.filter(order=order).first()

        # If already verified as SUCCESS, return immediately
        if payment and payment.payment_status == "SUCCESS":
            return Response(
                {
                    "status": "SUCCESS",
                    "order_status": order.status,
                    "order_id": order.id,
                    "transaction_id": payment.transaction_id,
                },
                status=status.HTTP_200_OK,
            )

        session_id = request.query_params.get("session_id") or (
            payment.stripe_session_id if payment else None
        )
        secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()

        # Direct safe recovery polling from Stripe if webhook has not arrived yet
        if order.status == "PENDING" and session_id and secret_key:
            stripe.api_key = secret_key
            try:
                session = stripe.checkout.Session.retrieve(session_id)
                session_payment_status = (
                    session.get("payment_status")
                    if isinstance(session, dict)
                    else getattr(session, "payment_status", None)
                )
                client_ref = (
                    session.get("client_reference_id")
                    if isinstance(session, dict)
                    else getattr(session, "client_reference_id", None)
                )
                amount_total = (
                    session.get("amount_total")
                    if isinstance(session, dict)
                    else getattr(session, "amount_total", None)
                )
                currency = (
                    (session.get("currency") if isinstance(session, dict) else getattr(session, "currency", ""))
                    or ""
                ).lower()

                expected_currency, expected_subunits = convert_to_stripe_subunits(
                    order.total_price,
                    getattr(settings, "STRIPE_CURRENCY", "inr")
                )

                if (
                    session_payment_status == "paid"
                    and str(client_ref) == str(order.id)
                    and currency == expected_currency
                    and int(amount_total) == expected_subunits
                ):
                    payment_intent = (
                        session.get("payment_intent")
                        if isinstance(session, dict)
                        else getattr(session, "payment_intent", None)
                    )
                    if not payment:
                        payment = Payment.objects.create(
                            order=order,
                            payment_method="STRIPE",
                            payment_status="SUCCESS",
                            amount=order.total_price,
                            transaction_id=payment_intent or session_id,
                            stripe_session_id=session_id,
                            paid_at=timezone.now(),
                        )
                    else:
                        payment.payment_method = "STRIPE"
                        payment.payment_status = "SUCCESS"
                        payment.transaction_id = payment_intent or session_id
                        payment.stripe_session_id = session_id
                        payment.paid_at = timezone.now()
                        payment.save(
                            update_fields=[
                                "payment_method",
                                "payment_status",
                                "transaction_id",
                                "stripe_session_id",
                                "paid_at",
                                "updated_at",
                            ]
                        )

                    order.status = "PROCESSING"
                    order.save(update_fields=["status"])
                    clear_cart_for_user(order.user)

                    logger.info("Direct Stripe recovery verified payment for order %s", order.id)

                    return Response(
                        {
                            "status": "SUCCESS",
                            "order_status": order.status,
                            "order_id": order.id,
                            "transaction_id": payment.transaction_id,
                        },
                        status=status.HTTP_200_OK,
                    )
            except Exception as exc:
                logger.warning(
                    "Direct session retrieval check failed for session %s: %s",
                    session_id,
                    str(exc),
                )

        current_status = payment.payment_status if payment else "PENDING"
        return Response(
            {
                "status": current_status,
                "order_status": order.status,
                "order_id": order.id,
                "transaction_id": payment.transaction_id if payment else None,
            },
            status=status.HTTP_200_OK,
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
        if new_status == "SUCCESS":
            if order.status == "PENDING":
                order.status = "PROCESSING"
                order.save(update_fields=["status"])
            clear_cart_for_user(order.user)

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
