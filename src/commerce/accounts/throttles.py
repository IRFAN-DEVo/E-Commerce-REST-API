from rest_framework.throttling import SimpleRateThrottle, AnonRateThrottle


class ForgotPasswordThrottle(SimpleRateThrottle):
    """
    Limits how often users (by IP or authenticated user ID) can request
    password reset OTPs.
    """
    scope = "forgot_password"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class VerifyOTPThrottle(SimpleRateThrottle):
    """
    Limits how often users can attempt OTP verification to prevent
    brute-force attacks.
    """
    scope = "verify_otp"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ResendVerificationThrottle(SimpleRateThrottle):
    """
    Limits how often users can request a resend of their email verification OTP.
    """
    scope = "resend_verification"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class RequestPhoneOTPThrottle(SimpleRateThrottle):
    """
    Limits how often users can request phone verification OTPs
    to prevent SMS bombing and provider abuse.
    """
    scope = "request_phone_otp"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user_{request.user.pk}"
        else:
            ident = self.get_ident(request)

        phone = request.data.get("phone", "") if hasattr(request, "data") else ""
        if phone:
            from accounts.utils.phone import normalize_phone_number
            try:
                phone = normalize_phone_number(phone)
            except Exception:
                pass
            ident = f"{ident}_{phone}"

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class VerifyPhoneOTPThrottle(SimpleRateThrottle):
    """
    Limits phone verification attempts to prevent brute-forcing OTPs.
    """
    scope = "verify_phone_otp"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        session_token = request.data.get("session_token", "") if hasattr(request, "data") else ""
        if session_token:
            ident = f"{ident}_{session_token}"
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ResendPhoneOTPThrottle(SimpleRateThrottle):
    """
    Limits how often users can request a resend of their phone verification OTP.
    """
    scope = "resend_phone_otp"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user_{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }