from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.conf import settings
from accounts.models import User, PasswordResetOTP

RESET_TOKEN_SALT = "djangomart-password-reset-salt"
RESET_TOKEN_MAX_AGE = 900  # 15 minutes


def generate_reset_token(user, otp_record) -> str:
    """
    Generate a cryptographically signed, tamper-proof, single-use reset authorization token.
    Bound to the specific user and verified OTP challenge ID.
    """
    signer = TimestampSigner(salt=RESET_TOKEN_SALT)
    payload = {
        "user_id": user.id,
        "otp_id": otp_record.id,
    }
    return signer.sign_object(payload)


def verify_reset_token(token: str):
    """
    Verify the reset authorization token.
    Returns (user, otp_record) if valid, active, and not expired.
    Raises ValueError with descriptive reason otherwise.
    """
    if not token or not isinstance(token, str):
        raise ValueError("Reset authorization token is required.")

    signer = TimestampSigner(salt=RESET_TOKEN_SALT)
    try:
        payload = signer.unsign_object(token, max_age=RESET_TOKEN_MAX_AGE)
    except SignatureExpired:
        raise ValueError("Reset authorization has expired. Please request a new OTP.")
    except BadSignature:
        raise ValueError("Invalid reset authorization token.")

    user = User.objects.filter(id=payload.get("user_id"), is_active=True).first()
    if not user:
        raise ValueError("User account associated with this token not found or inactive.")

    otp_record = PasswordResetOTP.objects.filter(
        id=payload.get("otp_id"),
        user=user,
        is_verified=True,
    ).first()
    if not otp_record:
        raise ValueError("Reset authorization has already been used or invalidated.")

    return user, otp_record
