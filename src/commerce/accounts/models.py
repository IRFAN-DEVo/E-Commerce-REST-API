from django.db import models
from django.contrib.auth.models import AbstractUser
from datetime import timedelta
import hashlib
import secrets
from django.conf import settings
from django.utils import timezone

class User(AbstractUser):

    USER_TYPE_CHOICES = (
        ("owner", "Shop Owner"),
        ("customer", "Customer"),
    )

    email = models.EmailField(
        unique=True,
        blank=False,
    )

    user_type = models.CharField(
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default="customer",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
    )

    is_email_verified = models.BooleanField(
        default=False,
        help_text="Designates whether the user has verified their email address.",
    )

    class Meta:
        db_table = "users"
        ordering = ["username"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username
    


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_otps",
    )

    otp_hash = models.CharField(
        max_length=64,
        editable=False,
    )

    expires_at = models.DateTimeField()

    attempts = models.PositiveSmallIntegerField(default=0)

    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "password_reset_otps"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["user", "is_verified"]),
        ]

    def __str__(self):
        return f"Password reset OTP for {self.user.email}"

    @staticmethod
    def generate_otp():
        """
        Returns a cryptographically secure 6-digit OTP.
        """
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def hash_otp(otp: str) -> str:
        """
        Returns a SHA-256 hash of the OTP.
        """
        return hashlib.sha256(otp.encode()).hexdigest()

    @classmethod
    def create_otp(cls, user):
        """
        Creates a new OTP for the user and returns the plain OTP.
        """

        # Remove any previous unused OTPs
        cls.objects.filter(
            user=user,
            is_verified=False,
        ).delete()

        otp = cls.generate_otp()

        obj = cls.objects.create(
            user=user,
            otp_hash=cls.hash_otp(otp),
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        return obj, otp

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def verify(self, otp):
        """
        Verifies the OTP.
        """

        if self.is_verified:
            return False

        if self.is_expired():
            return False

        if self.attempts >= 5:
            return False

        self.attempts += 1
        self.save(update_fields=["attempts"])

        if self.hash_otp(otp) != self.otp_hash:
            return False

        self.is_verified = True
        self.save(update_fields=["is_verified"])

        return True


class EmailVerificationOTP(models.Model):
    """
    Challenge record for email verification during account registration.
    Stores cryptographically hashed 6-digit OTPs with 5-minute expiration
    and attempt limiting.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_otps",
    )

    otp_hash = models.CharField(
        max_length=64,
        editable=False,
    )

    expires_at = models.DateTimeField()

    attempts = models.PositiveSmallIntegerField(default=0)

    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "email_verification_otps"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["user", "is_verified"]),
        ]

    def __str__(self):
        return f"Email verification OTP for {self.user.email}"

    @staticmethod
    def generate_otp():
        """
        Returns a cryptographically secure 6-digit OTP.
        """
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def hash_otp(otp: str) -> str:
        """
        Returns a SHA-256 hash of the OTP.
        """
        return hashlib.sha256(otp.encode()).hexdigest()

    @classmethod
    def create_otp(cls, user):
        """
        Creates a new verification OTP for the user and returns (record, plain_otp).
        Deletes any previous unverified OTPs for this user.
        """
        cls.objects.filter(
            user=user,
            is_verified=False,
        ).delete()

        otp = cls.generate_otp()

        obj = cls.objects.create(
            user=user,
            otp_hash=cls.hash_otp(otp),
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        return obj, otp

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def verify(self, otp):
        """
        Verifies the given OTP against the stored hash.
        Enforces single-use, max 5 attempts, and expiry.
        """
        if self.is_verified:
            return False

        if self.is_expired():
            return False

        if self.attempts >= 5:
            return False

        self.attempts += 1
        self.save(update_fields=["attempts"])

        if self.hash_otp(otp) != self.otp_hash:
            return False

        self.is_verified = True
        self.save(update_fields=["is_verified"])

        return True