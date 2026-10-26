from datetime import timedelta
import secrets
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import PhoneVerificationOTP, EmailVerificationOTP
from accounts.services.sms import DummySMSProvider, SMSResult, get_sms_provider
from accounts.utils.phone import normalize_phone_number, validate_phone_number

User = get_user_model()


@override_settings(
    SMS_PROVIDER="dummy",
    OTP_EXPIRY_SECONDS=300,
    OTP_RESEND_COOLDOWN_SECONDS=60,
    OTP_MAX_ATTEMPTS=5,
    OTP_HMAC_SECRET="test_hmac_secret_for_phone_otp_security_verification_key",
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "request_phone_otp": "5/minute",
            "verify_phone_otp": "15/minute",
            "resend_phone_otp": "5/minute",
        },
    },
)
class PhoneVerificationTests(TestCase):
    def setUp(self):
        cache.clear()
        DummySMSProvider.clear()
        self.client = APIClient()

        # Create a test customer user
        self.user = User.objects.create_user(
            username="phone_test_user",
            email="phone_user@djangomart.com",
            first_name="Phone User",
            password="StrongPassword123!",
            phone="+919876543210",
            is_active=True,
            is_email_verified=True,
            is_phone_verified=False,
        )

        # Create an auth token for the user
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

        # Another user for cross-user isolation tests
        self.other_user = User.objects.create_user(
            username="other_phone_user",
            email="other_phone@djangomart.com",
            first_name="Other User",
            password="OtherPassword123!",
            phone="+919123456789",
            is_active=True,
            is_email_verified=True,
            is_phone_verified=True,
        )

    def test_phone_normalization_and_validation(self):
        """Test phone normalization to standard E.164 and rejection of invalid formats."""
        self.assertEqual(normalize_phone_number("9876543210", default_region="IN"), "+919876543210")
        self.assertEqual(normalize_phone_number("+91 98765 43210"), "+919876543210")
        self.assertTrue(validate_phone_number("+919876543210"))

        # Invalid formats
        self.assertFalse(validate_phone_number("not_a_phone"))
        self.assertFalse(validate_phone_number("12345"))
        self.assertFalse(validate_phone_number(""))

    def test_authenticated_otp_request_and_verification(self):
        """Test complete flow of requesting and verifying an OTP for an authenticated user."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        # 1. Request OTP
        resp = self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        self.assertIn("phone", resp.data)

        # Security check: OTP must never appear in response
        self.assertNotIn("otp", resp.data)
        self.assertNotIn("otp_hash", resp.data)

        # Check that DummySMSProvider captured the message
        self.assertEqual(len(DummySMSProvider.sent_messages), 1)
        sms = DummySMSProvider.sent_messages[0]
        self.assertEqual(sms["to_phone"], "+919876543210")

        # Extract OTP from message for testing verification
        import re
        match = re.search(r"\b(\d{6})\b", sms["message"])
        self.assertIsNotNone(match)
        otp = match.group(1)

        # 2. Verify with valid OTP
        verify_resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": otp},
        )
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data["is_phone_verified"])

        # Check user model was updated in database
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_phone_verified)
        self.assertEqual(self.user.phone, "+919876543210")

    def test_incorrect_otp_rejection_and_attempt_limiting(self):
        """Test rejection of incorrect OTP and max attempts threshold."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})
        challenge = PhoneVerificationOTP.objects.get(user=self.user, is_verified=False)

        # 4 incorrect attempts
        for i in range(4):
            resp = self.client.post(
                "/api/v1/accounts/phone/verify-otp/",
                {"phone": "+919876543210", "otp": "000000"},
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("remaining", resp.data["detail"].lower())

        challenge.refresh_from_db()
        self.assertEqual(challenge.attempts, 4)
        self.assertFalse(challenge.is_verified)

        # 5th failed attempt -> locks out challenge
        resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": "000000"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too many failed attempts", resp.data["detail"].lower())

        challenge.refresh_from_db()
        self.assertEqual(challenge.attempts, 5)

        # Subsequent attempts rejected immediately
        resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": "123456"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_otp_rejection(self):
        """Test that expired OTP challenges cannot be verified."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})

        challenge = PhoneVerificationOTP.objects.get(user=self.user, is_verified=False)
        challenge.expires_at = timezone.now() - timedelta(seconds=10)
        challenge.save(update_fields=["expires_at"])

        resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": "123456"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", resp.data["detail"].lower())

    def test_reused_consumed_otp_rejected(self):
        """Test that once consumed, an OTP cannot be reused."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})

        import re
        sms = DummySMSProvider.sent_messages[0]
        otp = re.search(r"\b(\d{6})\b", sms["message"]).group(1)

        # Verify successfully
        resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": otp},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Try reusing same OTP
        resp2 = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": otp},
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resending_supersedes_previous_challenge(self):
        """Test that resending an OTP creates a fresh challenge and supersedes the old one."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})

        import re
        sms1 = DummySMSProvider.sent_messages[0]
        old_otp = re.search(r"\b(\d{6})\b", sms1["message"]).group(1)

        # Bypass cooldown for the test
        challenge = PhoneVerificationOTP.objects.get(user=self.user, is_verified=False)
        challenge.last_sent_at = timezone.now() - timedelta(seconds=70)
        challenge.save(update_fields=["last_sent_at"])

        # Resend
        resend_resp = self.client.post(
            "/api/v1/accounts/phone/resend-otp/",
            {"phone": "+919876543210"},
        )
        self.assertEqual(resend_resp.status_code, status.HTTP_200_OK)

        # Old OTP must no longer verify
        bad_resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": old_otp},
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # New OTP must verify
        sms2 = DummySMSProvider.sent_messages[1]
        new_otp = re.search(r"\b(\d{6})\b", sms2["message"]).group(1)
        good_resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": "+919876543210", "otp": new_otp},
        )
        self.assertEqual(good_resp.status_code, status.HTTP_200_OK)

    def test_resend_cooldown_enforcement(self):
        """Test that requesting a resend before cooldown expires returns 429."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.client.post("/api/v1/accounts/phone/request-otp/", {"phone": "+919876543210"})

        # Immediate resend should be blocked by cooldown
        resp = self.client.post(
            "/api/v1/accounts/phone/resend-otp/",
            {"phone": "+919876543210"},
        )
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("wait", resp.data["detail"].lower())

    def test_phone_number_changes_reset_verification_status(self):
        """Test that modifying user phone number resets is_phone_verified to False."""
        self.user.is_phone_verified = True
        self.user.save()
        self.assertTrue(self.user.is_phone_verified)

        # Update phone number
        self.user.phone = "+919999888877"
        self.user.save()

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_phone_verified)

    def test_cannot_claim_already_verified_phone_of_another_user(self):
        """Test that a user cannot verify a phone number already verified by another account."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        # other_user has verified phone '+919123456789'
        resp = self.client.post(
            "/api/v1/accounts/phone/request-otp/",
            {"phone": "+919123456789"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", resp.data)

    def test_unauthenticated_session_challenge_flow(self):
        """Test unauthenticated phone verification using short-lived session token."""
        # 1. Request OTP without credentials
        resp = self.client.post(
            "/api/v1/accounts/phone/request-otp/",
            {"phone": "+919876500000"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        session_token = resp.data["session_token"]
        self.assertTrue(len(session_token) > 0)

        # Extract OTP
        import re
        sms = DummySMSProvider.sent_messages[0]
        otp = re.search(r"\b(\d{6})\b", sms["message"]).group(1)

        # 2. Verify OTP with session token
        verify_resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"session_token": session_token, "otp": otp},
        )
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data["is_phone_verified"])

    def test_phone_status_endpoint(self):
        """Test phone status endpoint returns current verification state."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        resp = self.client.get("/api/v1/accounts/phone/status/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["phone"], "+919876543210")
        self.assertFalse(resp.data["is_phone_verified"])

        # Update user to verified
        self.user.is_phone_verified = True
        self.user.save(update_fields=["is_phone_verified"])

        resp2 = self.client.get("/api/v1/accounts/phone/status/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["is_phone_verified"])

    def test_sms_provider_failure_handling(self):
        """Test graceful handling when SMS delivery fails."""
        from unittest.mock import patch

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        with patch.object(
            DummySMSProvider,
            "send_sms",
            return_value=SMSResult(success=False, error_message="Provider timeout"),
        ):
            resp = self.client.post(
                "/api/v1/accounts/phone/request-otp/",
                {"phone": "+919876543210"},
            )
            self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
            self.assertFalse(resp.data["success"])
            # Ensure no orphan unverified challenge remains active
            self.assertFalse(
                PhoneVerificationOTP.objects.filter(user=self.user, is_verified=False).exists()
            )

    def test_registration_and_email_verification_lifecycle_preserved(self):
        """Test that existing email OTP registration lifecycle remains intact."""
        signup_data = {
            "name": "New Registrant",
            "email": "newbie@djangomart.com",
            "phone": "+919811122233",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
        }

        # Step 1: Signup
        signup_resp = self.client.post("/api/v1/accounts/register/", signup_data)
        self.assertEqual(signup_resp.status_code, status.HTTP_201_CREATED)

        # User is NOT yet in the database
        self.assertFalse(User.objects.filter(email="newbie@djangomart.com").exists())

        # Email challenge exists
        email_otp = EmailVerificationOTP.objects.get(email="newbie@djangomart.com")
        self.assertEqual(email_otp.name, "New Registrant")

        # Step 2: Pre-verify phone in onboarding
        phone_challenge, p_otp = PhoneVerificationOTP.create_challenge(phone="+919811122233")
        phone_challenge.verify(p_otp)
        self.assertTrue(phone_challenge.is_verified)

        # Step 3: Verify email with dummy OTP
        # We can extract or generate OTP for email_otp
        email_otp_val = "123456"
        email_otp.otp_hash = email_otp.hash_otp(email_otp_val)
        email_otp.save(update_fields=["otp_hash"])

        verify_resp = self.client.post(
            "/api/v1/accounts/verify-email/",
            {"email": "newbie@djangomart.com", "otp": email_otp_val},
        )
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)

        # User now created and phone verified from pre-verification!
        new_user = User.objects.get(email="newbie@djangomart.com")
        self.assertTrue(new_user.is_email_verified)
        self.assertTrue(new_user.is_phone_verified)

    def test_profile_endpoint_includes_phone_verification_flags(self):
        """Test that the user profile API includes is_phone_verified."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        resp = self.client.get("/api/v1/accounts/profile/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("is_phone_verified", resp.data)
        self.assertFalse(resp.data["is_phone_verified"])

        self.user.is_phone_verified = True
        self.user.save(update_fields=["is_phone_verified"])

        resp2 = self.client.get("/api/v1/accounts/profile/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["is_phone_verified"])

    def test_unauthorized_user_cannot_verify_another_users_challenge(self):
        """Test that user A cannot verify an active challenge belonging to user B."""
        # Create a challenge for other_user
        challenge, otp = PhoneVerificationOTP.create_challenge(
            phone=self.other_user.phone,
            user=self.other_user,
        )

        # self.user attempts to verify other_user's challenge
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        resp = self.client.post(
            "/api/v1/accounts/phone/verify-otp/",
            {"phone": self.other_user.phone, "otp": otp},
        )
        # Must be rejected because challenge belongs to other_user
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rate_limiting_request_phone_otp(self):
        """Test that requests exceeding throttle limit are blocked with 429."""
        cache.clear()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        # 5 requests should be accepted (rate is 5/minute)
        for i in range(5):
            # Bypass cooldown on existing challenges so we test the throttle
            PhoneVerificationOTP.objects.filter(user=self.user).delete()
            resp = self.client.post(
                "/api/v1/accounts/phone/request-otp/",
                {"phone": "+919876543210"},
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # 6th request must trigger DRF throttle
        PhoneVerificationOTP.objects.filter(user=self.user).delete()
        blocked_resp = self.client.post(
            "/api/v1/accounts/phone/request-otp/",
            {"phone": "+919876543210"},
        )
        self.assertEqual(blocked_resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_console_provider_disallowed_in_production(self):
        """Test that ConsoleSMSProvider raises ImproperlyConfigured when DEBUG is False."""
        from django.core.exceptions import ImproperlyConfigured
        from accounts.services.sms import ConsoleSMSProvider

        with override_settings(DEBUG=False):
            with self.assertRaises(ImproperlyConfigured):
                ConsoleSMSProvider()

