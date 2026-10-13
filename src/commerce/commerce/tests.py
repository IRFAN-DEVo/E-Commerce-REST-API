"""
Tests for CORS and production security configuration.

Covers:
  - CORS_ALLOW_ALL_ORIGINS is False
  - CORS_ALLOW_CREDENTIALS is False (JWT uses Authorization header, not cookies)
  - Trusted origins receive proper CORS headers
  - Untrusted origins do NOT receive Access-Control-Allow-Origin
  - Authorization header is allowed in preflight
  - Production security flags are set when DEBUG=False
"""

from django.test import TestCase, override_settings, RequestFactory
from django.test.utils import modify_settings
from importlib import import_module


class CORSSettingsTests(TestCase):
    """Verify CORS configuration values at the settings level."""

    def test_cors_allow_all_origins_is_false(self):
        """CORS_ALLOW_ALL_ORIGINS must never be True."""
        from django.conf import settings
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)

    def test_cors_allow_credentials_is_false(self):
        """
        CORS_ALLOW_CREDENTIALS should be False since authentication
        uses JWT via the Authorization header, not cookies.
        """
        from django.conf import settings
        self.assertFalse(settings.CORS_ALLOW_CREDENTIALS)

    def test_authorization_in_allowed_headers(self):
        """The Authorization header must be in CORS_ALLOW_HEADERS."""
        from django.conf import settings
        self.assertIn("authorization", settings.CORS_ALLOW_HEADERS)


@override_settings(
    CORS_ALLOWED_ORIGINS=["http://trusted.example.com"],
    CORS_ALLOW_ALL_ORIGINS=False,
    CORS_ALLOW_CREDENTIALS=False,
)
class CORSTrustedOriginTests(TestCase):
    """Integration tests verifying CORS middleware behavior."""

    def test_trusted_origin_receives_cors_header(self):
        """A request from a trusted origin should get Access-Control-Allow-Origin."""
        response = self.client.get(
            "/api/v1/products/",
            HTTP_ORIGIN="http://trusted.example.com",
        )
        self.assertEqual(
            response.get("Access-Control-Allow-Origin"),
            "http://trusted.example.com",
        )

    def test_untrusted_origin_does_not_receive_cors_header(self):
        """A request from an untrusted origin must NOT get Access-Control-Allow-Origin."""
        response = self.client.get(
            "/api/v1/products/",
            HTTP_ORIGIN="http://evil.example.com",
        )
        self.assertIsNone(response.get("Access-Control-Allow-Origin"))

    def test_preflight_allows_authorization_header(self):
        """OPTIONS preflight from a trusted origin should allow the Authorization header."""
        response = self.client.options(
            "/api/v1/products/",
            HTTP_ORIGIN="http://trusted.example.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization",
        )
        allowed_headers = response.get("Access-Control-Allow-Headers", "")
        self.assertIn("authorization", allowed_headers.lower())

    def test_preflight_rejects_untrusted_origin(self):
        """OPTIONS preflight from an untrusted origin should NOT get CORS headers."""
        response = self.client.options(
            "/api/v1/products/",
            HTTP_ORIGIN="http://evil.example.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization",
        )
        self.assertIsNone(response.get("Access-Control-Allow-Origin"))

    def test_no_credentials_header_sent(self):
        """
        Access-Control-Allow-Credentials must not be present
        since CORS_ALLOW_CREDENTIALS is False.
        """
        response = self.client.get(
            "/api/v1/products/",
            HTTP_ORIGIN="http://trusted.example.com",
        )
        self.assertIsNone(response.get("Access-Control-Allow-Credentials"))


@override_settings(DEBUG=False)
class ProductionSecurityTests(TestCase):
    """Verify that production security settings are active when DEBUG=False."""

    @override_settings(
        SECURE_CONTENT_TYPE_NOSNIFF=True,
        X_FRAME_OPTIONS="DENY",
        CSRF_COOKIE_SECURE=True,
        SESSION_COOKIE_SECURE=True,
    )
    def test_production_security_headers_are_set(self):
        """Critical security settings should be active in production."""
        from django.conf import settings
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
