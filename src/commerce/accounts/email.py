import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_password_reset_email(*, user, otp: str):
    """
    Send a secure password reset OTP email using the configured email backend.
    Styled according to DjangoMart's minimalist black-and-white brand design.
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@djangomart.com")
    subject = "Your DjangoMart Password Reset OTP Code"

    recipient_name = user.first_name or user.username or "Customer"

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #18181b;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <tr>
                <td style="padding: 28px 32px; background-color: #000000; text-align: center;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">DjangoMart</span>
                </td>
            </tr>
            <!-- Body -->
            <tr>
                <td style="padding: 36px 32px;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #000000; margin: 0 0 16px 0;">Reset Your Password</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
                        Hello {recipient_name},<br>
                        We received a request to reset your password. Use the verification code below to authorize your password update:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="text-align: center; margin: 28px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #000000; background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 28px; font-family: monospace;">
                            {otp}
                        </span>
                    </div>

                    <p style="font-size: 13px; line-height: 1.5; color: #71717a; margin: 0 0 16px 0; text-align: center;">
                        This code is valid for <strong>5 minutes</strong>. For your security, do not share this code with anyone.
                    </p>

                    <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 28px 0 20px 0;">

                    <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; margin: 0;">
                        If you did not request this password reset, no action is needed. Your account remains completely secure and your password will not be changed.
                    </p>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                    <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
                        &copy; DjangoMart E-Commerce Platform. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_message = (
        f"DjangoMart Password Reset\n\n"
        f"Hello {recipient_name},\n\n"
        f"Your password reset verification code is: {otp}\n\n"
        f"This code will expire in 5 minutes.\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"- The DjangoMart Team"
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=from_email,
        to=[user.email],
    )

    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)


def send_verification_email(*, user, otp: str):
    """
    Send an email verification 6-digit OTP email using the configured email backend.
    Styled according to DjangoMart's minimalist black-and-white brand design.
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@djangomart.com")
    subject = "Your DjangoMart Email Verification Code"

    recipient_name = user.first_name or user.username or "Customer"

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #18181b;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <tr>
                <td style="padding: 28px 32px; background-color: #000000; text-align: center;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">DjangoMart</span>
                </td>
            </tr>
            <!-- Body -->
            <tr>
                <td style="padding: 36px 32px;">
                    <h2 style="font-size: 20px; font-weight: 700; color: #000000; margin: 0 0 16px 0;">Verify Your Email Address</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
                        Hello {recipient_name},<br>
                        Thank you for joining DjangoMart! To complete your registration and activate your account, please enter the 6-digit verification code below:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="text-align: center; margin: 28px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #000000; background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 28px; font-family: monospace;">
                            {otp}
                        </span>
                    </div>

                    <p style="font-size: 13px; line-height: 1.5; color: #71717a; margin: 0 0 16px 0; text-align: center;">
                        This code is valid for <strong>5 minutes</strong>. For your security, do not share this code with anyone.
                    </p>

                    <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 28px 0 20px 0;">

                    <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; margin: 0;">
                        If you did not create an account on DjangoMart, you can safely ignore this email. No account will be activated without this verification code.
                    </p>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                    <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
                        &copy; DjangoMart E-Commerce Platform. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_message = (
        f"DjangoMart Email Verification\n\n"
        f"Hello {recipient_name},\n\n"
        f"Thank you for joining DjangoMart! Your 6-digit verification code is: {otp}\n\n"
        f"This code will expire in 5 minutes.\n"
        f"If you did not sign up for a DjangoMart account, please ignore this email.\n\n"
        f"- The DjangoMart Team"
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=from_email,
        to=[user.email],
    )

    email.attach_alternative(html_message, "text/html")
    email.send(fail_silently=False)

