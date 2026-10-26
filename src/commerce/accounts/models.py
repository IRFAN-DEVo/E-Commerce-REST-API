from datetime import timedelta
import hashlib
import hmac
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

    is_phone_verified = models.BooleanField(
        default=False,
        help_text="Designates whether the user has verified their phone number.",
    )

    class Meta:
        db_table = "users"
        ordering = ["username"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        # Reset phone verification if phone number changes on an existing user
        if self.pk:
            try:
                old_instance = User.objects.filter(pk=self.pk).only("phone", "is_phone_verified").first()
                if old_instance and old_instance.phone != self.phone:
                    update_fields = kwargs.get("update_fields")
                    if update_fields is None or "is_phone_verified" not in update_fields:
                        self.is_phone_verified = False
            except Exception:
                pass
        super().save(*args, **kwargs)


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


class PhoneVerificationOTP(models.Model):
    """
    Challenge record for secure phone number OTP verification.
    Stores phone number in E.164 format and an HMAC-SHA256 verifier with
    short expiration (default 5 mins), max attempt limiting (default 5),
    and resend cooldown (default 60s).
    Supports both authenticated user verification and unauthenticated session challenges.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="phone_verification_otps",
    )
    phone = models.CharField(
        max_length=32,
        db_index=True,
        help_text="Normalized E.164 phone number",
    )
    session_token = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        help_text="Short-lived cryptographic challenge token for unauthenticated registration",
    )
    otp_hash = models.CharField(
        max_length=64,
        editable=False,
    )
    expires_at = models.DateTimeField(db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    is_verified = models.BooleanField(default=False)
    last_sent_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "phone_verification_otps"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["phone"]),
            models.Index(fields=["session_token"]),
            models.Index(fields=["user"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["phone", "is_verified"]),
            models.Index(fields=["session_token", "is_verified"]),
        ]

    def __str__(self):
        return f"Phone verification OTP for {self.phone}"

    @staticmethod
    def generate_otp() -> str:
        """Generates a 6-digit cryptographically secure OTP string."""
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def hash_otp(phone: str, otp: str, session_token: str = "") -> str:
        """
        Computes HMAC-SHA256 of the OTP bound to the target phone and session.
        Uses a dedicated server-side secret (settings.OTP_HMAC_SECRET) or a
        cryptographic derivation of settings.SECRET_KEY.
        """
        raw_secret = getattr(settings, "OTP_HMAC_SECRET", "").strip()
        if not raw_secret:
            raw_secret = hashlib.sha256(f"djangomart_phone_otp_key:{settings.SECRET_KEY}".encode()).hexdigest()
        key = raw_secret.encode("utf-8")
        msg = f"{phone}:{session_token}:{otp}".encode("utf-8")
        return hmac.new(key, msg, hashlib.sha256).hexdigest()

    @classmethod
    def create_challenge(cls, phone: str, user=None, session_token: str = ""):
        """
        Creates a fresh phone verification OTP challenge.
        Supersedes and purges existing pending unverified challenges for the same phone/user.
        """
        expiry_seconds = getattr(settings, "OTP_EXPIRY_SECONDS", 300)
        max_attempts = getattr(settings, "OTP_MAX_ATTEMPTS", 5)

        # Invalidate unverified challenges for this phone or session
        if phone:
            cls.objects.filter(phone=phone, is_verified=False).delete()
        if session_token:
            cls.objects.filter(session_token=session_token, is_verified=False).delete()
        if user is not None:
            cls.objects.filter(user=user, is_verified=False).delete()

        otp = cls.generate_otp()
        otp_hash = cls.hash_otp(phone=phone, otp=otp, session_token=session_token)

        obj = cls.objects.create(
            user=user,
            phone=phone,
            session_token=session_token,
            otp_hash=otp_hash,
            expires_at=timezone.now() + timedelta(seconds=expiry_seconds),
            max_attempts=max_attempts,
            attempts=0,
            last_sent_at=timezone.now(),
        )
        return obj, otp

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def can_resend(self) -> bool:
        cooldown = getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
        elapsed = (timezone.now() - self.last_sent_at).total_seconds()
        return elapsed >= cooldown

    def cooldown_remaining(self) -> int:
        cooldown = getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
        elapsed = (timezone.now() - self.last_sent_at).total_seconds()
        remaining = int(cooldown - elapsed)
        return max(0, remaining)

    def verify(self, otp: str) -> bool:
        if self.is_verified:
            return False

        if self.is_expired():
            return False

        if self.attempts >= self.max_attempts:
            return False

        self.attempts += 1
        self.save(update_fields=["attempts", "updated_at"])

        expected_hash = self.hash_otp(self.phone, otp, self.session_token)
        if not hmac.compare_digest(expected_hash, self.otp_hash):
            return False

        self.is_verified = True
        self.save(update_fields=["is_verified", "updated_at"])
        return True

