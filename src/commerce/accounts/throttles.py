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