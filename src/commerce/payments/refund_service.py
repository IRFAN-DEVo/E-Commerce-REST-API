import logging
from decimal import Decimal
import stripe
import razorpay
from django.conf import settings
from django.utils import timezone
from payments.models import Payment

logger = logging.getLogger(__name__)


def process_order_refund(payment: Payment) -> tuple[str, str | None, Decimal | None]:
    """
    Initiates a verified server-side refund for a paid order through the appropriate gateway.
    Returns: (refund_status, refund_id, refund_amount)
    Status is one of:
      - 'COMPLETED': Confirmed successful refund from payment provider
      - 'PROCESSING': Refund acknowledged by gateway and currently processing
      - 'MANUAL_PROCESSING_REQUIRED': Gateway failure or manual settlement required
      - 'NOT_APPLICABLE': Unpaid order, no charge was captured
    """
    if not payment or payment.payment_status != "SUCCESS":
        return "NOT_APPLICABLE", None, None

    if payment.refund_status in ("COMPLETED", "PROCESSING"):
        return payment.refund_status, payment.refund_id, payment.refund_amount

    amount = payment.amount
    method = payment.payment_method

    if method == "COD":
        # COD payments marked paid require physical / offline reconciliation
        return "MANUAL_PROCESSING_REQUIRED", None, amount

    if method == "STRIPE":
        return _process_stripe_refund(payment, amount)

    if method == "RAZORPAY":
        return _process_razorpay_refund(payment, amount)

    return "MANUAL_PROCESSING_REQUIRED", None, amount


def _process_stripe_refund(payment: Payment, amount: Decimal) -> tuple[str, str | None, Decimal | None]:
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
    if not secret_key:
        logger.error("Stripe secret key is not configured for payment refund on payment #%s", payment.id)
        return "MANUAL_PROCESSING_REQUIRED", None, amount

    stripe.api_key = secret_key

    target_id = payment.transaction_id or ""
    payment_intent_id = None
    charge_id = None

    if target_id.startswith("pi_"):
        payment_intent_id = target_id
    elif target_id.startswith("ch_"):
        charge_id = target_id
    elif payment.stripe_session_id or target_id.startswith("cs_"):
        session_id = payment.stripe_session_id or target_id
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            payment_intent_id = (
                session.get("payment_intent")
                if isinstance(session, dict)
                else getattr(session, "payment_intent", None)
            )
        except Exception as exc:
            logger.warning("Could not retrieve Stripe session %s for refund: %s", session_id, exc)

    if not payment_intent_id and not charge_id:
        logger.error("No valid payment_intent or charge reference on payment #%s for refund", payment.id)
        return "MANUAL_PROCESSING_REQUIRED", None, amount

    try:
        # Convert to subunits (cents / paise)
        amount_subunits = int(round(amount * 100))
        refund_kwargs = {"amount": amount_subunits}

        if payment_intent_id:
            refund_kwargs["payment_intent"] = payment_intent_id
        elif charge_id:
            refund_kwargs["charge"] = charge_id

        refund = stripe.Refund.create(**refund_kwargs)
        refund_id = getattr(refund, "id", None) or refund.get("id")
        status_str = getattr(refund, "status", None) or refund.get("status")

        if status_str == "succeeded":
            logger.info("Stripe refund %s completed for payment #%s", refund_id, payment.id)
            return "COMPLETED", refund_id, amount
        elif status_str in ("pending", "processing"):
            logger.info("Stripe refund %s processing for payment #%s", refund_id, payment.id)
            return "PROCESSING", refund_id, amount
        else:
            logger.warning("Stripe refund returned non-terminal status '%s' for payment #%s", status_str, payment.id)
            return "PROCESSING", refund_id, amount

    except stripe.error.StripeError as exc:
        logger.error("Stripe API refund failure on payment #%s: %s", payment.id, str(exc))
        return "MANUAL_PROCESSING_REQUIRED", None, amount
    except Exception as exc:
        logger.error("Unexpected error during Stripe refund on payment #%s: %s", payment.id, str(exc))
        return "MANUAL_PROCESSING_REQUIRED", None, amount


def _process_razorpay_refund(payment: Payment, amount: Decimal) -> tuple[str, str | None, Decimal | None]:
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()

    if not key_id or not key_secret:
        logger.error("Razorpay API credentials missing for refund on payment #%s", payment.id)
        return "MANUAL_PROCESSING_REQUIRED", None, amount

    payment_id = payment.transaction_id
    if not payment_id:
        logger.error("Missing transaction_id (payment_id) on payment #%s for Razorpay refund", payment.id)
        return "MANUAL_PROCESSING_REQUIRED", None, amount

    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        amount_paise = int(round(amount * 100))
        refund = client.payment.refund(payment_id, amount_paise)

        refund_id = refund.get("id") if isinstance(refund, dict) else getattr(refund, "id", None)
        status_str = refund.get("status") if isinstance(refund, dict) else getattr(refund, "status", None)

        if status_str == "processed":
            logger.info("Razorpay refund %s completed for payment #%s", refund_id, payment.id)
            return "COMPLETED", refund_id, amount
        elif status_str == "pending":
            logger.info("Razorpay refund %s pending for payment #%s", refund_id, payment.id)
            return "PROCESSING", refund_id, amount
        else:
            return "PROCESSING", refund_id, amount

    except Exception as exc:
        logger.error("Razorpay API refund failure on payment #%s: %s", payment.id, str(exc))
        return "MANUAL_PROCESSING_REQUIRED", None, amount

