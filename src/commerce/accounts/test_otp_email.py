import io
import smtplib
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import PasswordResetOTP
from accounts.tokens import generate_reset_token

User = get_user_model()


class SMTPEmailCommandTests(TestCase):
    """
    Test suite for the test_smtp_email diagnostic management command.
    """

    def test_smtp_command_probe_only_success(self):
        """Verify --probe-only tests the connection and succeeds without sending an email."""
        out = io.StringIO()
        with patch("accounts.management.commands.test_smtp_email.get_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_get_conn.return_value = mock_conn

            call_command("test_smtp_email", probe_only=True, stdout=out)

            mock_conn.open.assert_called_once()
            output = out.getvalue()
            self.assertIn("=== DjangoMart SMTP Diagnostic Probe ===", output)
            self.assertIn("SMTP handshake and authentication succeeded!", output)
            self.assertIn("No test email was sent (--probe-only)", output)

    def test_smtp_command_send_email_success(self):
        """Verify command sends diagnostic email to specified recipient."""
        out = io.StringIO()
        with patch("accounts.management.commands.test_smtp_email.get_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_conn.send_messages.return_value = 1
            mock_get_conn.return_value = mock_conn

            call_command("test_smtp_email", recipient="recipient@example.com", stdout=out)

            mock_conn.open.assert_called_once()
            mock_conn.send_messages.assert_called_once()
            output = out.getvalue()
            self.assertIn("Test email successfully submitted to SMTP server", output)
            self.assertIn("recipient@example.com", output)

    def test_smtp_command_invalid_recipient_email(self):
        """Verify command rejects invalid recipient email address format."""
        out = io.StringIO()
        with patch("accounts.management.commands.test_smtp_email.get_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_get_conn.return_value = mock_conn

            with self.assertRaises(CommandError) as ctx:
                call_command("test_smtp_email", recipient="invalid-email-address", stdout=out)

            self.assertIn("Invalid recipient email address", str(ctx.exception))
            mock_conn.send_messages.assert_not_called()

    def test_smtp_command_authentication_error(self):
        """Verify command handles SMTPAuthenticationError with clean diagnostic message."""
        out = io.StringIO()
        with patch("accounts.management.commands.test_smtp_email.get_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_conn.open.side_effect = smtplib.SMTPAuthenticationError(535, b"Authentication failed")
            mock_get_conn.return_value = mock_conn

            call_command("test_smtp_email", probe_only=True, stdout=out)

            output = out.getvalue()
            self.assertIn("[FAIL] SMTP Authentication Error", output)
            self.assertIn("Hint: For Gmail, ensure you are using a 16-character App Password", output)

    @override_settings(EMAIL_USE_TLS=True, EMAIL_USE_SSL=True)
    def test_smtp_command_conflicting_tls_ssl(self):
        """Verify command raises CommandError when both TLS and SSL are enabled."""
        out = io.StringIO()
        with self.assertRaises(CommandError) as ctx:
            call_command("test_smtp_email", probe_only=True, stdout=out)
        self.assertIn("EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be True", str(ctx.exception))


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="DjangoMart <irfancalicut7@gmail.com>",
)
class PasswordResetOTPFlowTests(APITestCase):
    """
    Comprehensive tests for the end-to-end OTP email and password reset flow:
    - Forgot Password API (dispatching email, creating OTP hash, rate limiting, anti-enumeration)
    - Verify OTP API (expiration, attempt limits, lockouts, one-time token issuance)
    - Reset Password API (token validation, password updates, session & OTP invalidation)
    """

    def setUp(self):
        mail.outbox.clear()
        self.user_email = "customer@example.com"
        self.user = User.objects.create_user(
            username="customer_user",
            email=self.user_email,
            password="OriginalPassword123!",
            first_name="Alice",
            last_name="Smith",
        )
        self.forgot_url = "/api/v1/accounts/forgot-password/"
        self.verify_url = "/api/v1/accounts/verify-otp/"
        self.reset_url = "/api/v1/accounts/reset-password/"

    def test_forgot_password_sends_email_with_correct_branding_and_content(self):
        """Valid registered user receives branded OTP email with 5-minute expiry and support link."""
        response = self.client.post(self.forgot_url, {"email": self.user_email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data.get("detail"),
            "If an account with that email exists, an OTP has been sent.",
        )

        # Check outbox
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, [self.user_email])
        self.assertEqual(sent_email.from_email, "DjangoMart <irfancalicut7@gmail.com>")
        self.assertIn("DjangoMart - Password Reset OTP Code:", sent_email.subject)

        # Verify body contains required security guidance and support info
        self.assertIn("5 minutes", sent_email.body)
        self.assertIn("support@djangomart.com", sent_email.body)
        self.assertIn("Alice", sent_email.body)

        # Check HTML alternative
        self.assertTrue(len(sent_email.alternatives) > 0)
        html_content, mimetype = sent_email.alternatives[0]
        self.assertEqual(mimetype, "text/html")
        self.assertIn("DjangoMart", html_content)
        self.assertIn("support@djangomart.com", html_content)

        # Verify OTP record in database
        otp_record = PasswordResetOTP.objects.filter(user=self.user).first()
        self.assertIsNotNone(otp_record)
        self.assertFalse(otp_record.is_verified)
        self.assertEqual(otp_record.attempts, 0)
        # OTP hash is SHA-256 (64 hex characters)
        self.assertEqual(len(otp_record.otp_hash), 64)
        # Expiration is approximately 5 minutes in future
        time_diff = otp_record.expires_at - timezone.now()
        self.assertTrue(timedelta(minutes=4) < time_diff <= timedelta(minutes=5))

    def test_forgot_password_nonexistent_email_does_not_leak_or_send(self):
        """Nonexistent email returns identical 200 response without sending email or creating OTP."""
        response = self.client.post(self.forgot_url, {"email": "nonexistent@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data.get("detail"),
            "If an account with that email exists, an OTP has been sent.",
        )
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(PasswordResetOTP.objects.count(), 0)

    @patch("accounts.email.EmailMultiAlternatives.send")
    def test_forgot_password_email_failure_cleans_up_otp(self, mock_send):
        """When email sending fails, the un-emailed OTP is cleaned up and 500 is returned."""
        mock_send.side_effect = smtplib.SMTPException("SMTP connection refused")

        response = self.client.post(self.forgot_url, {"email": self.user_email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Unable to dispatch password reset email", response.data.get("detail", ""))

        # Verify no orphaned OTP was saved
        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 0)

    def test_verify_otp_valid_returns_reset_token(self):
        """Correct OTP verification marks challenge verified and issues a single-use reset token."""
        otp_record, otp = PasswordResetOTP.create_otp(self.user)

        response = self.client.post(
            self.verify_url,
            {"email": self.user_email, "otp": otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("reset_token", response.data)
        self.assertTrue(len(response.data["reset_token"]) > 20)

        otp_record.refresh_from_db()
        self.assertTrue(otp_record.is_verified)
        self.assertEqual(otp_record.attempts, 1)

    def test_verify_otp_invalid_code_increments_attempts(self):
        """Incorrect OTP code returns 400 and increments attempts counter."""
        otp_record, _ = PasswordResetOTP.create_otp(self.user)

        response = self.client.post(
            self.verify_url,
            {"email": self.user_email, "otp": "999999"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or expired OTP", response.data.get("detail", ""))

        otp_record.refresh_from_db()
        self.assertFalse(otp_record.is_verified)
        self.assertEqual(otp_record.attempts, 1)

    def test_verify_otp_max_attempts_lockout(self):
        """After 5 failed attempts, OTP challenge is locked out and rejects further attempts."""
        otp_record, otp = PasswordResetOTP.create_otp(self.user)
        otp_record.attempts = 5
        otp_record.save(update_fields=["attempts"])

        # Attempt with the actual correct OTP
        response = self.client.post(
            self.verify_url,
            {"email": self.user_email, "otp": otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Maximum verification attempts exceeded", response.data.get("detail", ""))

        otp_record.refresh_from_db()
        self.assertFalse(otp_record.is_verified)

    def test_verify_otp_expired_code_rejected(self):
        """Expired OTP is rejected."""
        otp_record, otp = PasswordResetOTP.create_otp(self.user)
        otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        otp_record.save(update_fields=["expires_at"])

        response = self.client.post(
            self.verify_url,
            {"email": self.user_email, "otp": otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or expired OTP", response.data.get("detail", ""))

        otp_record.refresh_from_db()
        self.assertFalse(otp_record.is_verified)

    def test_verify_otp_cannot_be_reverified(self):
        """Already verified OTP cannot be verified again."""
        otp_record, otp = PasswordResetOTP.create_otp(self.user)
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        response = self.client.post(
            self.verify_url,
            {"email": self.user_email, "otp": otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_with_token_success(self):
        """End-to-end password update with valid reset token updates password and invalidates tokens."""
        otp_record, _ = PasswordResetOTP.create_otp(self.user)
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        token = generate_reset_token(self.user, otp_record)

        new_password = "SecureNewPassword456@"
        response = self.client.post(
            self.reset_url,
            {
                "reset_token": token,
                "password": new_password,
                "confirm_password": new_password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Password reset successfully", response.data.get("detail", ""))

        # Verify password actually updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.assertFalse(self.user.check_password("OriginalPassword123!"))

        # Verify OTP record was deleted or cleaned up
        self.assertFalse(PasswordResetOTP.objects.filter(id=otp_record.id).exists())

    def test_reset_password_token_reuse_rejected(self):
        """A reset token cannot be used a second time."""
        otp_record, _ = PasswordResetOTP.create_otp(self.user)
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        token = generate_reset_token(self.user, otp_record)
        new_password = "SecureNewPassword456@"

        # First reset succeeds
        resp1 = self.client.post(
            self.reset_url,
            {
                "reset_token": token,
                "password": new_password,
                "confirm_password": new_password,
            },
            format="json",
        )
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second reset attempt with same token fails
        resp2 = self.client.post(
            self.reset_url,
            {
                "reset_token": token,
                "password": "AnotherNewPassword789!",
                "confirm_password": "AnotherNewPassword789!",
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_mismatched_passwords_rejected(self):
        """Mismatched password and confirm_password yields 400 validation error."""
        otp_record, _ = PasswordResetOTP.create_otp(self.user)
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        token = generate_reset_token(self.user, otp_record)

        response = self.client.post(
            self.reset_url,
            {
                "reset_token": token,
                "password": "ValidPassword123!",
                "confirm_password": "DifferentPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
