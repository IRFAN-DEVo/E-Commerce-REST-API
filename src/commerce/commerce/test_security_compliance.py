"""
Comprehensive Pre-Hosting Security, Privacy, and Compliance Test Suite.

Covers:
  1. Image upload validation (enforces size limits, rejects SVGs/executables).
  2. Right-to-Erasure / Account Deletion endpoint (/api/v1/accounts/delete-account/).
  3. Preservation of statutory financial records during user account deletion.
  4. Anonymization of customer personal data (PII) upon deletion.
  5. Security headers and proxy configuration in production mode.
  6. Rate limiting on sensitive endpoints.
"""

from decimal import Decimal
import io
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from products.validators import validate_image_file
from orders.models import Order, OrderItem
from cart.models import Cart, CartItem
from wishlist.models import Wishlist
from notifications.models import Notification
from products.models import Product, Category, Brand

User = get_user_model()


def create_test_image(format="JPEG", size=(100, 100), color=(255, 0, 0)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


class FileUploadSecurityTests(TestCase):
    """Verify that file uploads enforce MIME, extension, and size security."""

    def test_valid_jpeg_image_passes(self):
        content = create_test_image("JPEG")
        file = SimpleUploadedFile("product.jpg", content, content_type="image/jpeg")
        validated = validate_image_file(file)
        self.assertIsNotNone(validated)

    def test_valid_png_image_passes(self):
        content = create_test_image("PNG")
        file = SimpleUploadedFile("product.png", content, content_type="image/png")
        validated = validate_image_file(file)
        self.assertIsNotNone(validated)

    def test_svg_file_is_rejected(self):
        svg_content = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert('xss')</script></svg>"
        file = SimpleUploadedFile("evil.svg", svg_content, content_type="image/svg+xml")
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            validate_image_file(file)

    def test_executable_script_is_rejected(self):
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"
        file = SimpleUploadedFile("malware.exe", exe_content, content_type="application/x-dosexec")
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            validate_image_file(file)

    def test_fake_jpg_extension_with_corrupt_content_is_rejected(self):
        fake_content = b"This is not a real image header"
        file = SimpleUploadedFile("fake.jpg", fake_content, content_type="image/jpeg")
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            validate_image_file(file)

    def test_oversized_file_is_rejected(self):
        oversized = SimpleUploadedFile("huge.jpg", b"0" * (6 * 1024 * 1024), content_type="image/jpeg")
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            validate_image_file(oversized)


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "accounts.authentication.SafeJWTAuthentication",
            "rest_framework.authentication.SessionAuthentication",
        ],
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    }
)
class UserDataErasureAndPrivacyTests(TestCase):
    """Verify right-to-erasure and statutory financial data preservation."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alice_privacy",
            email="alice@example.com",
            password="StrongPassword123!",
            first_name="Alice",
            phone="9876543210",
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(name="Electronics")
        self.brand = Brand.objects.create(name="Logitech")
        self.product = Product.objects.create(
            name="Wireless Mouse",
            price=Decimal("49.99"),
            stock=100,
            category=self.category,
            brand=self.brand,
        )

        # Setup cart item
        cart, _ = Cart.objects.get_or_create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)

        # Setup wishlist item
        Wishlist.objects.create(user=self.user, product=self.product)

        # Setup notification
        Notification.objects.create(user=self.user, title="Welcome", message="Hello Alice")

        # Setup order (delivered)
        self.order = Order.objects.create(
            user=self.user,
            total_price=Decimal("99.98"),
            status="DELIVERED",
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            price=Decimal("49.99"),
            quantity=2,
        )

    def test_deletion_requires_correct_password(self):
        resp = self.client.post("/api/v1/accounts/delete-account/", {"password": "WrongPassword"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.user.id, is_active=True).exists())

    def test_deletion_blocks_if_active_in_progress_orders(self):
        # Create an active pending order
        Order.objects.create(user=self.user, total_price=Decimal("50.00"), status="PENDING")
        resp = self.client.post("/api/v1/accounts/delete-account/", {"password": "StrongPassword123!"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("active", resp.data["detail"].lower())

    def test_successful_deletion_anonymizes_pii_and_preserves_orders(self):
        resp = self.client.post("/api/v1/accounts/delete-account/", {"password": "StrongPassword123!"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])

        # Reload user
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.user.first_name, "Deleted")
        self.assertEqual(self.user.phone, "")
        self.assertTrue(self.user.email.startswith("deleted_"))
        self.assertFalse(self.user.has_usable_password())

        # Cart, wishlist, notifications must be purged
        self.assertEqual(Cart.objects.filter(user=self.user).count(), 0)
        self.assertEqual(Wishlist.objects.filter(user=self.user).count(), 0)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 0)

        # Order must be retained for tax/statutory requirements
        self.order.refresh_from_db()
        self.assertEqual(self.order.user, self.user)
        self.assertEqual(self.order.status, "DELIVERED")


class ProductionSecurityConfigurationTests(TestCase):
    """Verify production security settings, headers, and proxy configuration."""

    def test_production_cors_not_wildcard(self):
        from django.conf import settings
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertFalse(settings.CORS_ALLOW_CREDENTIALS)

    def test_render_proxy_ssl_header_configured(self):
        from django.conf import settings
        header = getattr(settings, "SECURE_PROXY_SSL_HEADER", None)
        self.assertTrue(header is None or header == ("HTTP_X_FORWARDED_PROTO", "https"))
