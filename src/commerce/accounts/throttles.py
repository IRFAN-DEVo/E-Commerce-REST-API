from rest_framework.throttling import AnonRateThrottle


class ForgotPasswordThrottle(AnonRateThrottle):
    """
    Limits how often anonymous users can request
    password reset OTPs.
    """

    scope = "forgot_password"