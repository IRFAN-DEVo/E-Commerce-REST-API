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

from django.core.cache import cache
from accounts.models import PasswordResetOTP, EmailVerificationOTP

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
        cache.clear()
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
        cache.clear()
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


# ---------------------------------------------------------------------------
# VerifyOTPView Tests
# ---------------------------------------------------------------------------
@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "forgot_password": None,
        "verify_otp": None,
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class VerifyOTPViewTests(TestCase):
    """Integration tests for the VerifyOTPView endpoint."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = reverse("verify-otp")
        self.user = User.objects.create_user(
            username="verifyuser",
            email="verify@example.com",
            password="VerifyPass123!",
            first_name="Verify",
        )
        self.otp_record, self.plain_otp = PasswordResetOTP.create_otp(self.user)

    def test_verify_otp_success_returns_reset_token(self):
        """Valid OTP returns 200 and a cryptographic reset_token."""
        resp = self.client.post(self.url, {"email": "verify@example.com", "otp": self.plain_otp})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("reset_token", resp.data)
        self.assertTrue(resp.data["reset_token"])
        self.otp_record.refresh_from_db()
        self.assertTrue(self.otp_record.is_verified)

    def test_verify_otp_fails_with_wrong_code(self):
        """Incorrect OTP returns 400 and increments attempt count."""
        resp = self.client.post(self.url, {"email": "verify@example.com", "otp": "999999"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.otp_record.refresh_from_db()
        self.assertEqual(self.otp_record.attempts, 1)

    def test_verify_otp_fails_when_expired(self):
        """Expired OTP returns 400."""
        self.otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        self.otp_record.save(update_fields=["expires_at"])
        resp = self.client.post(self.url, {"email": "verify@example.com", "otp": self.plain_otp})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_otp_fails_after_max_attempts(self):
        """5 incorrect attempts permanently invalidate the OTP challenge."""
        for _ in range(5):
            self.client.post(self.url, {"email": "verify@example.com", "otp": "000000"})

        # Now try with the correct OTP
        resp = self.client.post(self.url, {"email": "verify@example.com", "otp": self.plain_otp})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_otp_cannot_be_reused(self):
        """Once verified, calling verify-otp again with same code is rejected."""
        resp1 = self.client.post(self.url, {"email": "verify@example.com", "otp": self.plain_otp})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self.client.post(self.url, {"email": "verify@example.com", "otp": self.plain_otp})
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_otp_unknown_email(self):
        """Attempting verification with unknown email returns 400."""
        resp = self.client.post(self.url, {"email": "nobody@example.com", "otp": "123456"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# ResetPasswordWithTokenTests
# ---------------------------------------------------------------------------
@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "forgot_password": None,
        "verify_otp": None,
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ResetPasswordWithTokenTests(TestCase):
    """Integration tests for resetting password using a signed reset_token."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.verify_url = reverse("verify-otp")
        self.reset_url = reverse("reset-password")
        self.user = User.objects.create_user(
            username="tokenuser",
            email="tokenuser@example.com",
            password="OldPass123!",
            first_name="TokenUser",
        )
        self.otp_record, self.plain_otp = PasswordResetOTP.create_otp(self.user)
        # Verify and obtain token
        v_resp = self.client.post(
            self.verify_url,
            {"email": "tokenuser@example.com", "otp": self.plain_otp}
        )
        self.assertEqual(v_resp.status_code, status.HTTP_200_OK)
        self.reset_token = v_resp.data["reset_token"]

    def test_reset_with_valid_token_succeeds(self):
        """A valid reset_token resets the user's password."""
        payload = {
            "reset_token": self.reset_token,
            "password": "BrandNewSecret789!",
            "confirm_password": "BrandNewSecret789!",
        }
        resp = self.client.post(self.reset_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewSecret789!"))
        # All OTPs for the user should be cleared
        self.assertEqual(PasswordResetOTP.objects.filter(user=self.user).count(), 0)

    def test_token_cannot_be_reused(self):
        """A reset_token cannot be used twice (single-use guarantee)."""
        payload = {
            "reset_token": self.reset_token,
            "password": "BrandNewSecret789!",
            "confirm_password": "BrandNewSecret789!",
        }
        resp1 = self.client.post(self.reset_url, payload)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self.client.post(self.reset_url, {
            "reset_token": self.reset_token,
            "password": "AnotherNewSecret000!",
            "confirm_password": "AnotherNewSecret000!",
        })
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tampered_token_is_rejected(self):
        """Altering characters in reset_token causes cryptographic signature verification to fail."""
        tampered = self.reset_token[:-5] + "XXXXX"
        payload = {
            "reset_token": tampered,
            "password": "BrandNewSecret789!",
            "confirm_password": "BrandNewSecret789!",
        }
        resp = self.client.post(self.reset_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_confirmation_mismatch_with_token(self):
        """Mismatched passwords return 400 even with a valid token."""
        payload = {
            "reset_token": self.reset_token,
            "password": "BrandNewSecret789!",
            "confirm_password": "MismatchSecret999!",
        }
        resp = self.client.post(self.reset_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_with_token(self):
        """Password failing validators returns 400."""
        payload = {
            "reset_token": self.reset_token,
            "password": "123",
            "confirm_password": "123",
        }
        resp = self.client.post(self.reset_url, payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# EmailVerificationOTP Model Tests
# ---------------------------------------------------------------------------
class EmailVerificationOTPModelTests(TestCase):
    """Unit tests for the EmailVerificationOTP model."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="verify_otp_user",
            email="verify_otp@example.com",
            password="VerifyPass123!",
            first_name="VerifyUser",
            is_active=False,
            is_email_verified=False,
        )

    def test_create_otp_returns_instance_and_6_digit_string(self):
        """create_otp should return a model instance and a 6-digit numeric OTP."""
        otp_record, plain_otp = EmailVerificationOTP.create_otp(self.user)
        self.assertIsInstance(otp_record, EmailVerificationOTP)
        self.assertEqual(len(plain_otp), 6)
        self.assertTrue(plain_otp.isdigit())

    def test_otp_is_hashed_before_storage(self):
        """The stored otp_hash must NOT equal the plain OTP."""
        _, plain_otp = EmailVerificationOTP.create_otp(self.user)
        otp_record = EmailVerificationOTP.objects.get(user=self.user)
        self.assertNotEqual(otp_record.otp_hash, plain_otp)

    def test_verify_succeeds_with_correct_otp(self):
        """verify() returns True for a valid, unexpired OTP."""
        otp_record, plain_otp = EmailVerificationOTP.create_otp(self.user)
        self.assertTrue(otp_record.verify(plain_otp))
        self.assertTrue(otp_record.is_verified)

    def test_verify_fails_with_wrong_otp(self):
        """verify() returns False for an incorrect OTP."""
        otp_record, _ = EmailVerificationOTP.create_otp(self.user)
        self.assertFalse(otp_record.verify("000000"))
        self.assertFalse(otp_record.is_verified)
        self.assertEqual(otp_record.attempts, 1)

    def test_verify_fails_after_expiry(self):
        """verify() returns False when the OTP has expired."""
        otp_record, plain_otp = EmailVerificationOTP.create_otp(self.user)
        otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        otp_record.save(update_fields=["expires_at"])
        self.assertFalse(otp_record.verify(plain_otp))

    def test_verify_fails_after_max_attempts(self):
        """verify() returns False once 5 failed attempts have been reached."""
        otp_record, plain_otp = EmailVerificationOTP.create_otp(self.user)
        otp_record.attempts = 5
        otp_record.save(update_fields=["attempts"])
        self.assertFalse(otp_record.verify(plain_otp))

    def test_verify_cannot_be_reused(self):
        """A verified OTP cannot be verified a second time."""
        otp_record, plain_otp = EmailVerificationOTP.create_otp(self.user)
        self.assertTrue(otp_record.verify(plain_otp))
        self.assertFalse(otp_record.verify(plain_otp))

    def test_create_otp_deletes_previous_unverified(self):
        """Creating a new OTP removes any prior unverified OTPs for the user."""
        EmailVerificationOTP.create_otp(self.user)
        self.assertEqual(EmailVerificationOTP.objects.filter(user=self.user).count(), 1)

        EmailVerificationOTP.create_otp(self.user)
        self.assertEqual(EmailVerificationOTP.objects.filter(user=self.user).count(), 1)


# ---------------------------------------------------------------------------
# Registration and Email Verification Integration Tests
# ---------------------------------------------------------------------------
@override_settings(
    DEFAULT_THROTTLE_RATES={
        "anon": None,
        "user": None,
        "api-register": None,
        "verify_otp": None,
        "resend_verification": None,
    },
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class RegistrationAndEmailVerificationTests(TestCase):
    """End-to-end integration tests for registration and email OTP verification."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.register_url = reverse("user-create")
        self.verify_url = reverse("verify-email")
        self.resend_url = reverse("resend-verification-otp")
        self.login_url = reverse("token_obtain_pair")

    def _reg_payload(self, **overrides):
        data = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "9876543210",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
        }
        data.update(overrides)
        return data

    def test_registration_creates_unverified_user_and_sends_email(self):
        """Registration should create an inactive user and dispatch an email containing OTP."""
        from django.core import mail

        resp = self.client.post(self.register_url, self._reg_payload())
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data.get("requires_verification"))

        user = User.objects.get(email="jane@example.com")
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_email_verified)

        # Check that OTP record was created
        otp_record = EmailVerificationOTP.objects.filter(user=user).first()
        self.assertIsNotNone(otp_record)

        # Check email was dispatched
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("jane@example.com", mail.outbox[0].to)
        self.assertIn("Verification", mail.outbox[0].subject)

    def test_unverified_user_cannot_log_in(self):
        """An unverified user attempting to sign in should be rejected."""
        self.client.post(self.register_url, self._reg_payload())

        login_resp = self.client.post(
            self.login_url,
            {"email": "jane@example.com", "password": "SecurePassword123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verify your email", str(login_resp.data))

    def test_valid_otp_verifies_email_activates_user_and_returns_jwt(self):
        """Submitting the correct OTP activates the user and returns tokens."""
        self.client.post(self.register_url, self._reg_payload())
        user = User.objects.get(email="jane@example.com")
        otp_record, plain_otp = EmailVerificationOTP.create_otp(user)

        resp = self.client.post(
            self.verify_url,
            {"email": "jane@example.com", "otp": plain_otp},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)

        # Verification OTP records should be cleaned up
        self.assertEqual(EmailVerificationOTP.objects.filter(user=user).count(), 0)

        # User should now be able to log in normally
        login_resp = self.client.post(
            self.login_url,
            {"email": "jane@example.com", "password": "SecurePassword123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_invalid_otp_is_rejected(self):
        """An incorrect OTP code should return 400 and not activate user."""
        self.client.post(self.register_url, self._reg_payload())

        resp = self.client.post(
            self.verify_url,
            {"email": "jane@example.com", "otp": "000000"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(email="jane@example.com")
        self.assertFalse(user.is_active)

    def test_expired_otp_is_rejected(self):
        """Expired verification OTP should return 400."""
        self.client.post(self.register_url, self._reg_payload())
        user = User.objects.get(email="jane@example.com")
        otp_record, plain_otp = EmailVerificationOTP.create_otp(user)
        otp_record.expires_at = timezone.now() - timedelta(seconds=1)
        otp_record.save(update_fields=["expires_at"])

        resp = self.client.post(
            self.verify_url,
            {"email": "jane@example.com", "otp": plain_otp},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_max_attempts_locks_out_challenge(self):
        """5 failed attempts permanently lock out the challenge."""
        self.client.post(self.register_url, self._reg_payload())
        user = User.objects.get(email="jane@example.com")
        otp_record, plain_otp = EmailVerificationOTP.create_otp(user)

        for _ in range(5):
            self.client.post(
                self.verify_url,
                {"email": "jane@example.com", "otp": "999999"},
            )

        # Attempting with correct OTP should now fail
        resp = self.client.post(
            self.verify_url,
            {"email": "jane@example.com", "otp": plain_otp},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_verification_otp_sends_new_code(self):
        """Resend endpoint dispatches a new code and clears previous unverified OTP."""
        from django.core import mail

        self.client.post(self.register_url, self._reg_payload())
        mail.outbox.clear()

        resend_resp = self.client.post(
            self.resend_url,
            {"email": "jane@example.com"},
        )
        self.assertEqual(resend_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_verification_otp_rejects_already_verified_user(self):
        """Resend endpoint rejects a user whose email is already verified."""
        self.client.post(self.register_url, self._reg_payload())
        user = User.objects.get(email="jane@example.com")
        user.is_active = True
        user.is_email_verified = True
        user.save()

        resend_resp = self.client.post(
            self.resend_url,
            {"email": "jane@example.com"},
        )
        self.assertEqual(resend_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_registration_for_active_user_fails(self):
        """Attempting to register with an existing active email returns 400."""
        self.client.post(self.register_url, self._reg_payload())
        user = User.objects.get(email="jane@example.com")
        user.is_active = True
        user.save()

        resp = self.client.post(self.register_url, self._reg_payload())
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", resp.data)


# ---------------------------------------------------------------------------
# Email Configuration & Utility Tests
# ---------------------------------------------------------------------------
class EmailConfigurationTests(TestCase):
    """Verifies email settings resolution and OTP email dispatching."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="mailtestuser",
            email="mailtest@example.com",
            password="StrongPassword123!",
            first_name="MailTester",
        )

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@djangomart.com",
    )
    def test_send_password_reset_email_dispatches_multipart(self):
        from django.core import mail
        from accounts.email import send_password_reset_email

        mail.outbox.clear()
        send_password_reset_email(user=self.user, otp="654321")

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("mailtest@example.com", sent.to)
        self.assertIn("654321", sent.body)
        self.assertEqual(sent.from_email, "noreply@djangomart.com")
        self.assertIn("Password Reset", sent.subject)
        self.assertTrue(any(content_type == "text/html" for _, content_type in sent.alternatives))

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@djangomart.com",
    )
    def test_send_verification_email_dispatches_multipart(self):
        from django.core import mail
        from accounts.email import send_verification_email

        mail.outbox.clear()
        send_verification_email(user=self.user, otp="123456")

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertIn("mailtest@example.com", sent.to)
        self.assertIn("123456", sent.body)
        self.assertEqual(sent.from_email, "noreply@djangomart.com")
        self.assertIn("Verification", sent.subject)
        self.assertTrue(any(content_type == "text/html" for _, content_type in sent.alternatives))

    def test_settings_have_server_email_and_default_from_email(self):
        from django.conf import settings
        self.assertTrue(hasattr(settings, "DEFAULT_FROM_EMAIL"))
        self.assertTrue(hasattr(settings, "SERVER_EMAIL"))
        self.assertTrue(hasattr(settings, "EMAIL_TIMEOUT"))




