from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User, EmailVerificationOTP
from accounts.utils.phone import normalize_phone_number


class RegisterSerializer(serializers.Serializer):
    """
    Validates user registration input.
    The actual User object is created ONLY after the user verifies their email via OTP.
    """

    name = serializers.CharField(
        write_only=True,
        required=True,
        max_length=150,
    )
    email = serializers.EmailField(
        required=True,
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
    )

    def validate_phone(self, value):
        if not value or not str(value).strip():
            return ""
        return normalize_phone_number(value)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        validators=[validate_password],
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        normalized = value.lower().strip()
        # Active and verified accounts cannot be re-registered
        if User.objects.filter(email__iexact=normalized, is_active=True).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        return normalized

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(
        min_length=6,
        max_length=6,
        required=True,
        write_only=True,
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "OTP must contain only digits."
            )
        return value


class ResendVerificationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT login serializer that authenticates users by email + password
    instead of the default username + password.
    """

    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )

        if user is None:
            try:
                candidate = User.objects.get(email__iexact=email)
                if candidate.check_password(password) and not candidate.is_active:
                    raise serializers.ValidationError(
                        "Please verify your email address before signing in."
                    )
            except User.DoesNotExist:
                # Check if registration is still pending verification
                if EmailVerificationOTP.objects.filter(email__iexact=email, is_verified=False).exists():
                    raise serializers.ValidationError(
                        "Please verify your email address before signing in."
                    )

            raise serializers.ValidationError(
                "Invalid email or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "User account is disabled."
            )

        refresh = self.get_token(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(
        min_length=6,
        max_length=6,
        write_only=True,
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "OTP must contain only numbers."
            )
        return value


class ResetPasswordSerializer(serializers.Serializer):
    reset_token = serializers.CharField(
        required=False,
        allow_blank=False,
        write_only=True,
    )
    email = serializers.EmailField(
        required=False,
    )
    otp = serializers.CharField(
        min_length=6,
        max_length=6,
        required=False,
        write_only=True,
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        if value:
            return value.lower().strip()
        return value

    def validate_otp(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError(
                "OTP must contain only numbers."
            )
        return value

    def validate(self, attrs):
        if not attrs.get("reset_token") and (not attrs.get("email") or not attrs.get("otp")):
            raise serializers.ValidationError(
                "Either reset_token or (email and otp) is required."
            )

        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match."
                }
            )

        try:
            validate_password(attrs["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                {"password": list(e.messages)}
            )

        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "first_name",
            "last_name",
            "username",
            "email",
            "phone",
            "is_email_verified",
            "is_phone_verified",
            "user_type",
            "date_joined",
        ]
        read_only_fields = fields


class RequestPhoneOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Phone number to verify (with country code, e.g. +91...)",
    )

    def validate(self, attrs):
        request = self.context.get("request")
        phone = attrs.get("phone", "").strip()

        if not phone:
            if request and request.user and request.user.is_authenticated:
                phone = getattr(request.user, "phone", "").strip()
            if not phone:
                raise serializers.ValidationError({"phone": "Phone number is required."})

        normalized = normalize_phone_number(phone)
        attrs["normalized_phone"] = normalized

        # Check phone ownership: prevent claiming another user's verified phone
        user = request.user if (request and request.user and request.user.is_authenticated) else None
        conflict_query = User.objects.filter(phone=normalized, is_phone_verified=True)
        if user:
            conflict_query = conflict_query.exclude(pk=user.pk)
        if conflict_query.exists():
            raise serializers.ValidationError(
                {"phone": "This phone number cannot be verified. It is already associated with an existing verified account."}
            )

        return attrs


class VerifyPhoneOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    session_token = serializers.CharField(required=False, allow_blank=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_otp(self, value):
        val = value.strip()
        if not val.isdigit():
            raise serializers.ValidationError("OTP must consist of 6 numeric digits.")
        return val

    def validate(self, attrs):
        request = self.context.get("request")
        phone = attrs.get("phone", "").strip()
        session_token = attrs.get("session_token", "").strip()

        if phone:
            attrs["normalized_phone"] = normalize_phone_number(phone)
        elif session_token:
            attrs["normalized_phone"] = None
        elif request and request.user and request.user.is_authenticated:
            user_phone = getattr(request.user, "phone", "").strip()
            if not user_phone:
                raise serializers.ValidationError("No phone number associated with user. Please provide phone.")
            attrs["normalized_phone"] = normalize_phone_number(user_phone)
        else:
            raise serializers.ValidationError("A phone number or session token is required.")

        return attrs


class ResendPhoneOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    session_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context.get("request")
        phone = attrs.get("phone", "").strip()
        session_token = attrs.get("session_token", "").strip()

        if phone:
            attrs["normalized_phone"] = normalize_phone_number(phone)
        elif session_token:
            attrs["normalized_phone"] = None
        elif request and request.user and request.user.is_authenticated:
            user_phone = getattr(request.user, "phone", "").strip()
            if not user_phone:
                raise serializers.ValidationError("No phone number associated with user. Please provide phone.")
            attrs["normalized_phone"] = normalize_phone_number(user_phone)
        else:
            raise serializers.ValidationError("A phone number or session token is required.")

        return attrs

