import logging
from decimal import Decimal
from django.conf import settings
from rest_framework.exceptions import ValidationError
import stripe

logger = logging.getLogger(__name__)

# Currencies where 1 subunit = 1 currency unit (no decimals)
ZERO_DECIMAL_CURRENCIES = {
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
    "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"
}

# Currencies where 1 unit = 1000 subunits (three decimals)
THREE_DECIMAL_CURRENCIES = {
    "bhd", "jod", "kwd", "omr", "tnd"
}


def get_stripe_currency():
    """Returns normalized lowercase Stripe currency from settings (default 'inr')."""
    return getattr(settings, "STRIPE_CURRENCY", "inr").strip().lower()


def convert_to_stripe_subunits(amount, currency=None):
    """
    Converts a Decimal or float amount into the smallest currency unit
    according to Stripe's currency rules.
    """
    if currency is None:
        currency = get_stripe_currency()
    else:
        currency = str(currency).strip().lower()

    try:
        dec_amount = Decimal(str(amount))
    except Exception:
        raise ValidationError("Invalid numeric amount for payment.")

    if dec_amount <= Decimal("0"):
        raise ValidationError("Invalid order amount for payment.")

    if currency in ZERO_DECIMAL_CURRENCIES:
        subunits = int(round(dec_amount))
    elif currency in THREE_DECIMAL_CURRENCIES:
        subunits = int(round(dec_amount * Decimal("1000")))
    else:
        subunits = int(round(dec_amount * Decimal("100")))

    if subunits <= 0:
        raise ValidationError("Calculated payment amount must be greater than zero.")

    return currency, subunits


def get_stripe_client():
    """
    Returns configured Stripe secret key and verifies configuration.
    Raises ValidationError if secret key is missing.
    """
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
    if not secret_key:
        raise ValidationError("Stripe payment gateway is not configured.")
    stripe.api_key = secret_key
    return secret_key

