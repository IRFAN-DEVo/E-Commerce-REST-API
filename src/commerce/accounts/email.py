import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_password_reset_email(*, user, otp):
    """
    Send a password reset OTP email safely.
    Uses DEFAULT_FROM_EMAIL with safe fallback.
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@djangomart.com")
    subject = "Password Reset OTP - DjangoMart"

    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
            <h2>Password Reset Request</h2>

            <p>Hello {user.first_name or user.email},</p>

            <p>
                We received a request to reset your password.
            </p>

            <p>
                Your One-Time Password (OTP) is:
            </p>

            <h1 style="letter-spacing: 6px; color: #4f46e5; background: #f8fafc; padding: 12px 20px; display: inline-block; border-radius: 8px;">
                {otp}
            </h1>

            <p>
                This OTP will expire in <strong>5 minutes</strong>.
            </p>

            <p>
                If you did not request a password reset,
                you can safely ignore this email.
            </p>

            <br>

            <p>
                Thank you,<br>
                DjangoMart Team
            </p>
        </body>
    </html>
    """

    text_message = strip_tags(html_message)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=from_email,
        to=[user.email],
    )

    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)
