import phonenumbers
from rest_framework import serializers


def normalize_phone_number(raw_phone: str, default_region: str = "IN") -> str:
    """
    Normalizes a raw phone number into standard international E.164 format (e.g., +919876543210).
    Raises rest_framework.serializers.ValidationError if the number is invalid or cannot be parsed.
    """
    if not raw_phone or not str(raw_phone).strip():
        raise serializers.ValidationError("Phone number cannot be blank.")

    cleaned = str(raw_phone).strip()

    try:
        parsed = phonenumbers.parse(cleaned, default_region)
    except phonenumbers.NumberParseException as e:
        raise serializers.ValidationError(f"Invalid phone number format: {e._msg}")

    if not phonenumbers.is_possible_number(parsed):
        raise serializers.ValidationError("The provided phone number is not possible for the given region.")

    if not phonenumbers.is_valid_number(parsed):
        raise serializers.ValidationError("Please provide a valid phone number with country code.")

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def validate_phone_number(raw_phone: str, default_region: str = "IN") -> bool:
    """
    Boolean validation check for phone numbers.
    """
    try:
        normalize_phone_number(raw_phone, default_region=default_region)
        return True
    except serializers.ValidationError:
        return False


def mask_phone_number(e164_phone: str) -> str:
    """
    Masks a phone number for safe display in UI and logs (e.g. +91 ******4321).
    """
    if not e164_phone:
        return ""
    length = len(e164_phone)
    if length <= 5:
        return "*" * length
    return f"{e164_phone[:3]} {'*' * (length - 7)} {e164_phone[-4:]}"
