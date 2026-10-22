from datetime import timedelta
import hashlib
import secrets
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
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
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def hash_otp(otp: str) -> str:
        return hashlib.sha256(otp.encode()).hexdigest()

    @classmethod
    def create_otp(cls, user):
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
    Stores the pending user registration data (email, name, phone, password_hash)
    and cryptographically hashed 6-digit OTPs with 5-minute expiration
    and attempt limiting. The actual User account is NOT created in the database
    until the OTP is verified.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="email_verification_otps",
    )

    email = models.EmailField(
        db_index=True,
        default="",
        blank=True,
        help_text="Email address pending verification",
    )

    name = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Pending user full name",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Pending user phone number",
    )

    password_hash = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Pre-hashed password for pending user",
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
            models.Index(fields=["email"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["email", "is_verified"]),
        ]

    def __str__(self):
        target = self.email or (self.user.email if self.user else "Unknown")
        return f"Email verification OTP for {target}"

    @staticmethod
    def generate_otp():
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def hash_otp(otp: str) -> str:
        return hashlib.sha256(otp.encode()).hexdigest()

    @classmethod
    def create_otp(
        cls,
        user=None,
        *,
        email: str = None,
        name: str = "",
        phone: str = "",
        password: str = None,
        password_hash: str = None,
    ):
        from django.contrib.auth.hashers import make_password

        if user is not None:
            email = user.email
            name = user.first_name
            phone = getattr(user, "phone", "")
            password_hash = user.password

        email_clean = (email or "").lower().strip()

        if email_clean:
            cls.objects.filter(
                email__iexact=email_clean,
                is_verified=False,
            ).delete()

        if user is not None:
            cls.objects.filter(
                user=user,
                is_verified=False,
            ).delete()

        otp = cls.generate_otp()

        if password and not password_hash:
            password_hash = make_password(password)

        obj = cls.objects.create(
            user=user,
            email=email_clean,
            name=name or "",
            phone=phone or "",
            password_hash=password_hash or "",
            otp_hash=cls.hash_otp(otp),
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        return obj, otp

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def verify(self, otp):
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
