from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.services.google_auth import GoogleAuthError

User = get_user_model()


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
    def test_new_google_user_initiates_onboarding(self, mock_verify):
        """New Google user receives restricted onboarding token and no JWT before profile completion."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-12345",
            "email": "newbuyer@gmail.com",
            "email_verified": True,
            "name": "Google Provided Name",
        }

        response = self.client.post(self.google_auth_url, {"id_token": "valid_mock_token"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new_user"])
        self.assertTrue(response.data["needs_name"])
        self.assertIn("onboarding_token", response.data)
        self.assertEqual(response.data["email"], "newbuyer@gmail.com")
        # Ensure unrestricted JWT access is NOT issued before profile completion
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertFalse(User.objects.filter(email="newbuyer@gmail.com").exists())

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_name_completion_creates_user_and_issues_jwt(self, mock_verify):
        """Name completion validates user's manual name entry, creates account, and issues SimpleJWT tokens."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-12345",
            "email": "newbuyer@gmail.com",
            "email_verified": True,
        }

        # Step 1: Google Auth
        auth_resp = self.client.post(self.google_auth_url, {"id_token": "valid_mock_token"})
        onboarding_token = auth_resp.data["onboarding_token"]

        # Step 2: Name Entry Screen
        complete_resp = self.client.post(
            self.google_complete_url,
            {
                "onboarding_token": onboarding_token,
                "name": "Irfan M",
            },
        )

        self.assertEqual(complete_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", complete_resp.data)
        self.assertIn("refresh", complete_resp.data)
        self.assertEqual(complete_resp.data["user"]["name"], "Irfan M")
        self.assertEqual(complete_resp.data["user"]["email"], "newbuyer@gmail.com")

        # Verify database record
        user = User.objects.get(email="newbuyer@gmail.com")
        self.assertEqual(user.first_name, "Irfan M")
        self.assertTrue(user.is_email_verified)
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())

        # Step 3: Test JWT access token against protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {complete_resp.data['access']}")
        profile_resp = self.client.get(self.profile_url)
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_resp.data["email"], "newbuyer@gmail.com")

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_existing_google_user_logs_in_immediately_without_overwriting(self, mock_verify):
        """Existing user signs in immediately with JWT without altering existing profile info."""
        existing_user = User.objects.create_user(
            username="existing_customer",
            email="existing@gmail.com",
            first_name="Original Name",
            phone="9876543210",
            is_active=True,
            is_email_verified=True,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-99999",
            "email": "existing@gmail.com",
            "email_verified": True,
            "name": "Google Name That Should Be Ignored",
        }

        response = self.client.post(self.google_auth_url, {"id_token": "valid_token"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_new_user"])
        self.assertFalse(response.data["needs_name"])
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["name"], "Original Name")

        # Verify existing record was not overwritten
        existing_user.refresh_from_db()
        self.assertEqual(existing_user.first_name, "Original Name")
        self.assertEqual(existing_user.phone, "9876543210")

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
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-777",
            "email": "hybrid@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": "valid_token"})

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

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_invalid_google_token_rejected(self, mock_verify):
        """Invalid Google token raises 400 Bad Request."""
        mock_verify.side_effect = ValueError("Token signature is invalid.")

        response = self.client.post(self.google_auth_url, {"id_token": "invalid_token"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("accounts.services.google_auth.id_token.verify_oauth2_token")
    def test_unverified_google_email_rejected(self, mock_verify):
        """Google token with unverified email is rejected."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-unverified",
            "email": "unverified@gmail.com",
            "email_verified": False,
        }

        response = self.client.post(self.google_auth_url, {"id_token": "token_unverified"})

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
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-inactive",
            "email": "inactive@gmail.com",
            "email_verified": True,
        }

        response = self.client.post(self.google_auth_url, {"id_token": "token"})

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
            "aud": "240785442763-ogmqjuh55hdl6km5irh83gom90s670lu.apps.googleusercontent.com",
            "sub": "google-sub-12345",
            "email": "blankname@gmail.com",
            "email_verified": True,
        }

        auth_resp = self.client.post(self.google_auth_url, {"id_token": "token"})
        onboarding_token = auth_resp.data["onboarding_token"]

        response = self.client.post(
            self.google_complete_url,
            {"onboarding_token": onboarding_token, "name": "   "},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
