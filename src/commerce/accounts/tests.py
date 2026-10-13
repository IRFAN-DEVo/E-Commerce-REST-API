"""
Tests for the password reset (Forgot + Reset) flow.

Covers:
  - PasswordResetOTP model: creation, hashing, expiry, attempt limiting
  - ForgotPasswordView: correct 200 for both existing and non-existing emails
  - ResetPasswordView: valid reset, invalid OTP, expired OTP,
    password validation, and JWT token invalidation after reset
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import PasswordResetOTP

User = get_user_model()


# ---------------------------------------------------------------------------
# PasswordResetOTP Model Tests
# ---------------------------------------------------------------------------
class PasswordResetOTPModelTests(TestCase):
    """Unit tests for the PasswordResetOTP model."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="OldPass123!",
            first_name="Test",
        )

    def test_create_otp_returns_instance_and_6_digit_string(self):
        """create_otp should return a model instance and a 6-digit OTP."""
        otp_record, plain_otp = PasswordResetOTP.create_otp(self.user)

        self.assertIsInstance(otp_record, PasswordResetOTP)
        self.assertEqual(len(plain_otp), 6)
        self.assertTrue(plain_otp.isdigit())

    def test_otp_is_hashed_before_storage(self):
        """The stored otp_hash must NOT equal the plain OTP."""
        _, plain_otp = PasswordResetOTP.create_otp(self.user)
        otp_record = PasswordResetOTP.objects.get(user=self.user)
        self.assertNotEqual(otp_record.otp_hash, plain_otp)

    def test_verify_succeeds_with_correct_otp(self):
        """verify() returns True for a valid, un-expired OTP."""
        otp_record, plain_otp = PasswordResetOTP.create_otp(self.user)
        self.assertTrue(otp_record.verify(plain_otp))

    def test_verify_fails_with_wrong_otp(self):
        """verify() returns False for an incorrect OTP."""
        otp_record, _ = PasswordResetOTP.create_otp(self.user)
        self.assertFalse(otp_record.verify("000000"))

    def test_verify_fails_after_expiry(self):
        """verify() returns False when the OTP has expired."""
        otp_record, plain_otp = PasswordResetOTP.create_otp(self.user)
        otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        otp_record.save(update_fields=["expires_at"])

        self.assertFalse(otp_record.verify(plain_otp))

    def test_verify_fails_after_max_attempts(self):
        """verify() returns False once 5 failed attempts have been reached."""
        otp_record, plain_otp = PasswordResetOTP.create_otp(self.user)
        otp_record.attempts = 5
        otp_record.save(update_fields=["attempts"])

        self.assertFalse(otp_record.verify(plain_otp))

    def test_verify_cannot_be_reused(self):
        """A verified OTP cannot be verified a second time."""
        otp_record, plain_otp = PasswordResetOTP.create_otp(self.user)
        self.assertTrue(otp_record.verify(plain_otp))
        self.assertFalse(otp_record.verify(plain_otp))

    def test_create_otp_deletes_previous_unverified(self):
        """Creating a new OTP removes any prior unverified OTPs for the user."""
        PasswordResetOTP.create_otp(self.user)
        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 1)

        PasswordResetOTP.create_otp(self.user)
        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 1)


# ---------------------------------------------------------------------------
# ForgotPasswordView Tests
# ---------------------------------------------------------------------------
@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "forgot_password": None,
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ForgotPasswordViewTests(TestCase):
    """Integration tests for the ForgotPasswordView endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("forgot-password")
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="OldPass123!",
            first_name="Test",
        )

    def test_returns_200_for_existing_email(self):
        """Should return 200 and create an OTP for a valid user."""
        resp = self.client.post(self.url, {"email": "test@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            PasswordResetOTP.objects.filter(user=self.user).count(), 1
        )

    def test_returns_200_for_nonexistent_email(self):
        """Should still return 200 — never reveal whether email exists."""
        resp = self.client.post(
            self.url, {"email": "nobody@example.com"}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(PasswordResetOTP.objects.count(), 0)

    def test_sends_email_on_valid_request(self):
        """An email should be dispatched to the user's address."""
        from django.core import mail

        self.client.post(self.url, {"email": "test@example.com"})
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("test@example.com", mail.outbox[0].to)
        self.assertIn("OTP", mail.outbox[0].subject)

    def test_does_not_send_email_for_unknown_address(self):
        """No email should be sent when the address is unknown."""
        from django.core import mail

        self.client.post(
            self.url, {"email": "ghost@example.com"}
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_rejects_invalid_email_format(self):
        """Should return 400 for a malformed email."""
        resp = self.client.post(self.url, {"email": "not-an-email"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# ResetPasswordView Tests
# ---------------------------------------------------------------------------
@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "forgot_password": None,
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ResetPasswordViewTests(TestCase):
    """Integration tests for the ResetPasswordView endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("reset-password")
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="OldPass123!",
            first_name="Test",
        )
        self.otp_record, self.plain_otp = PasswordResetOTP.create_otp(
            self.user
        )

    def _reset_payload(self, **overrides):
        data = {
            "email": "test@example.com",
            "otp": self.plain_otp,
            "password": "NewSecure456!",
            "confirm_password": "NewSecure456!",
        }
        data.update(overrides)
        return data

    # --- Happy path ---

    def test_valid_reset_changes_password(self):
        """A valid OTP + matching passwords should reset the password."""
        resp = self.client.post(self.url, self._reset_payload())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecure456!"))

    def test_valid_reset_deletes_all_otps(self):
        """All OTPs for the user should be cleaned up after reset."""
        self.client.post(self.url, self._reset_payload())
        self.assertEqual(
            PasswordResetOTP.objects.filter(user=self.user).count(), 0
        )

    def test_valid_reset_blacklists_existing_tokens(self):
        """Pre-existing JWT refresh tokens should be blacklisted."""
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        # Issue a refresh token before the reset.
        refresh = RefreshToken.for_user(self.user)
        outstanding_before = OutstandingToken.objects.filter(
            user=self.user
        ).count()
        self.assertGreaterEqual(outstanding_before, 1)

        self.client.post(self.url, self._reset_payload())

        # Every outstanding token should now be blacklisted.
        blacklisted_count = BlacklistedToken.objects.filter(
            token__user=self.user
        ).count()
        self.assertEqual(blacklisted_count, outstanding_before)

    # --- Error cases ---

    def test_wrong_otp_returns_400(self):
        """An incorrect OTP should be rejected."""
        resp = self.client.post(
            self.url, self._reset_payload(otp="000000")
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_otp_returns_400(self):
        """An expired OTP should be rejected."""
        self.otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        self.otp_record.save(update_fields=["expires_at"])

        resp = self.client.post(self.url, self._reset_payload())
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_mismatch_returns_400(self):
        """Mismatched password/confirm_password should be rejected."""
        resp = self.client.post(
            self.url,
            self._reset_payload(confirm_password="DifferentPass789!"),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_returns_400(self):
        """A password that fails Django validators should be rejected."""
        resp = self.client.post(
            self.url,
            self._reset_payload(
                password="123",
                confirm_password="123",
            ),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_email_returns_400(self):
        """An email not linked to any user should return 400."""
        resp = self.client.post(
            self.url,
            self._reset_payload(email="ghost@example.com"),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_old_password_no_longer_works(self):
        """After a successful reset the original password must not work."""
        self.client.post(self.url, self._reset_payload())
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("OldPass123!"))


# ---------------------------------------------------------------------------
# LogoutEndpointTests
# ---------------------------------------------------------------------------
class LogoutEndpointTests(TestCase):
    """
    Integration tests for /api/v1/accounts/logout/ (TokenBlacklistView).
    Covers:
      - Successful logout blacklists the refresh token (200 OK)
      - Missing refresh token returns 400
      - Invalid/malformed refresh token returns 400
      - Re-using blacklisted token for token refresh returns 401 Unauthorized
      - Re-using blacklisted token for another logout returns 400 Bad Request
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="logout_user",
            email="logout@example.com",
            password="LogoutPass123!",
            first_name="Logout",
        )
        self.refresh = RefreshToken.for_user(self.user)
        self.url = "/api/v1/accounts/logout/"

    def test_successful_logout_blacklists_token(self):
        resp = self.client.post(self.url, {"refresh": str(self.refresh)}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Attempt to refresh access token using the blacklisted refresh token
        refresh_resp = self.client.post(
            "/api/v1/accounts/token/refresh/",
            {"refresh": str(self.refresh)},
            format="json",
        )
        self.assertEqual(refresh_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_with_missing_refresh_token(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_with_invalid_refresh_token(self):
        resp = self.client.post(self.url, {"refresh": "invalid.jwt.token"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_repeated_logout_with_already_blacklisted_token(self):
        # First logout succeeds
        resp1 = self.client.post(self.url, {"refresh": str(self.refresh)}, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second logout with already blacklisted token is rejected with 401
        resp2 = self.client.post(self.url, {"refresh": str(self.refresh)}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

