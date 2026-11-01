from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from google.auth import exceptions as google_exceptions
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.services.google_auth import GoogleAuthError

User = get_user_model()

MOCK_VALID_CLIENT_ID = "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com"
MOCK_JWT_STRUCTURE = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhdWQiOiIyNDA3ODU0NDI3NjMtb2dtcWp1aDU1aGRsNmttNWlyaDgzZ29tOTBzNjcwbHUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMjM0NSIsImVtYWlsIjoidGVzdEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0.mocksignaturebytes"


class GoogleAuthTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.google_auth_url = reverse("google-auth")
        self.google_complete_url = reverse("google-complete-profile")
        self.login_url = reverse("token_obtain_pair")
        self.profile_url = reverse("user-profile")

    def tearDown(self):
        cache.clear()

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_new_google_user_creates_incomplete_account_and_requires_name(self, mock_verify):
        """New Google user creates incomplete account (is_profile_complete=False) and receives restricted onboarding token without JWT."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-12345",
            "email": "newbuyer@gmail.com",
            "email_verified": True,
            "name": "Google Suggested Name That Must Be Ignored",
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new_user"])
        self.assertTrue(response.data["needs_name"])
        self.assertIn("onboarding_token", response.data)
        self.assertEqual(response.data["email"], "newbuyer@gmail.com")

        # Crucial security assertion: No unrestricted JWT access issued
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)

        # Incomplete account is created in database with empty first_name and is_profile_complete=False
        user = User.objects.get(email="newbuyer@gmail.com")
        self.assertEqual(user.first_name, "")
        self.assertFalse(user.is_profile_complete)
        self.assertTrue(user.is_email_verified)
        self.assertFalse(user.has_usable_password())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_name_completion_saves_name_marks_complete_and_issues_jwt(self, mock_verify):
        """Name completion validates user's manual name entry, marks profile complete, and issues SimpleJWT tokens."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-12345",
            "email": "newbuyer2@gmail.com",
            "email_verified": True,
        }

        # Step 1: Google Auth
        auth_resp = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})
        onboarding_token = auth_resp.data["onboarding_token"]

        # Step 2: Name Entry Screen
        complete_resp = self.client.post(
            self.google_complete_url,
            {
                "onboarding_token": onboarding_token,
                "name": "Irfan M",
            },
        )

        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", complete_resp.data)
        self.assertIn("refresh", complete_resp.data)
        self.assertEqual(complete_resp.data["user"]["name"], "Irfan M")
        self.assertEqual(complete_resp.data["user"]["email"], "newbuyer2@gmail.com")
        self.assertTrue(complete_resp.data["user"]["is_profile_complete"])

        # Verify database record updated
        user = User.objects.get(email="newbuyer2@gmail.com")
        self.assertEqual(user.first_name, "Irfan M")
        self.assertTrue(user.is_profile_complete)
        self.assertTrue(user.is_email_verified)
        self.assertTrue(user.is_active)

        # Step 3: Test JWT access token against protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {complete_resp.data['access']}")
        profile_resp = self.client.get(self.profile_url)
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_resp.data["email"], "newbuyer2@gmail.com")

    def test_incomplete_user_cannot_access_protected_apis(self):
        """Incomplete users are rejected by SafeJWTAuthentication when accessing protected APIs."""
        incomplete_user = User.objects.create_user(
            username="incomplete_shopper",
            email="incomplete_shopper@gmail.com",
            first_name="",
            is_active=True,
            is_email_verified=True,
            is_profile_complete=False,
        )
        token = RefreshToken.for_user(incomplete_user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")

        resp = self.client.get(self.profile_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("incomplete", resp.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_existing_google_user_with_complete_profile_logs_in_directly(self, mock_verify):
        """Existing user with complete profile logs in directly without prompting for name."""
        existing_user = User.objects.create_user(
            username="existing_customer",
            email="existing@gmail.com",
            first_name="Original Name",
            phone="9876543210",
            is_active=True,
            is_email_verified=True,
            is_profile_complete=True,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-99999",
            "email": "existing@gmail.com",
            "email_verified": True,
            "name": "Google Name That Should Be Ignored",
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_new_user"])
        self.assertFalse(response.data["needs_name"])
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["name"], "Original Name")
        self.assertTrue(response.data["user"]["is_profile_complete"])

        # Verify existing record was not overwritten
        existing_user.refresh_from_db()
        self.assertEqual(existing_user.first_name, "Original Name")

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_existing_user_with_incomplete_profile_requires_name_completion(self, mock_verify):
        """Existing user whose profile is not complete is redirected to name completion."""
        User.objects.create_user(
            username="existing_incomplete",
            email="incomplete_existing@gmail.com",
            first_name="",
            is_active=True,
            is_email_verified=True,
            is_profile_complete=False,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-incomplete",
            "email": "incomplete_existing@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["needs_name"])
        self.assertNotIn("access", response.data)
        self.assertIn("onboarding_token", response.data)

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_existing_email_password_user_logs_in_via_google_safely(self, mock_verify):
        """User with existing email/password account can log in via Google without duplicating account or breaking password."""
        password_user = User.objects.create_user(
            username="pwd_user",
            email="hybrid@gmail.com",
            first_name="Hybrid User",
            password="StrongPassword123!",
            is_active=True,
            is_email_verified=False,
            is_profile_complete=True,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-777",
            "email": "hybrid@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

        # Confirm no duplicate accounts created
        self.assertEqual(User.objects.filter(email="hybrid@gmail.com").count(), 1)

        # Confirm password remains working for traditional login
        password_user.refresh_from_db()
        self.assertTrue(password_user.check_password("StrongPassword123!"))
        self.assertTrue(password_user.is_email_verified)

        # Check traditional email/password login still works
        login_resp = self.client.post(
            self.login_url,
            {"email": "hybrid@gmail.com", "password": "StrongPassword123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_resp.data)

    def test_missing_google_token_rejected(self):
        """Missing or empty Google token is rejected."""
        response = self.client.post(self.google_auth_url, {"id_token": ""})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_google_token_rejected(self):
        """Malformed token lacking 3 segments is rejected."""
        response = self.client.post(self.google_auth_url, {"id_token": "not-a-valid-jwt"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("malformed", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_invalid_signature_rejected(self, mock_verify):
        """Invalid Google signature raises 400 Bad Request with signature error detail."""
        mock_verify.side_effect = google_exceptions.MalformedError("Could not verify token signature.")

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("signature", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_expired_google_token_rejected(self, mock_verify):
        """Expired Google ID token raises 400 Bad Request with expired error detail."""
        mock_verify.side_effect = google_exceptions.InvalidValue("Token expired, 1700000000 < 1700000010")

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_audience_mismatch_rejected(self, mock_verify):
        """Token with audience mismatch raises 400 Bad Request with audience error detail."""
        mock_verify.side_effect = google_exceptions.InvalidValue(
            "Token has wrong audience wrong-aud.apps.googleusercontent.com, expected one of ..."
        )

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("audience", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_issuer_mismatch_rejected(self, mock_verify):
        """Token with invalid issuer raises 400 Bad Request with issuer error detail."""
        mock_verify.return_value = {
            "iss": "https://malicious-issuer.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-12345",
            "email": "issuer_test@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("issuer", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_unverified_google_email_rejected(self, mock_verify):
        """Google token with unverified email is rejected."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-unverified",
            "email": "unverified@gmail.com",
            "email_verified": False,
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not verified", response.data["detail"].lower())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_disabled_user_rejected(self, mock_verify):
        """Disabled user account cannot authenticate via Google."""
        User.objects.create_user(
            username="inactive_user",
            email="inactive@gmail.com",
            is_active=False,
            is_email_verified=True,
            is_profile_complete=True,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-inactive",
            "email": "inactive@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disabled", response.data["detail"].lower())

    def test_tampered_or_invalid_onboarding_token_rejected(self):
        """Tampered onboarding token cannot complete profile."""
        response = self.client.post(
            self.google_complete_url,
            {"onboarding_token": "tampered.token.value", "name": "Fake Name"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_blank_name_rejected_on_completion(self, mock_verify):
        """Blank or whitespace-only name is rejected during profile completion."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": MOCK_VALID_CLIENT_ID,
            "sub": "google-sub-12345",
            "email": "blankname@gmail.com",
            "email_verified": True,
        }

        auth_resp = self.client.post(self.google_auth_url, {"id_token": MOCK_JWT_STRUCTURE})
        onboarding_token = auth_resp.data["onboarding_token"]

        response = self.client.post(
            self.google_complete_url,
            {"onboarding_token": onboarding_token, "name": "   "},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
