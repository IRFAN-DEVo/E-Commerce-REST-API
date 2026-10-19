from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User


class RegisterSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        write_only=True,
        required=True,
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        validators=[validate_password],
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "name",
            "email",
            "phone",
            "password",
            "confirm_password",
        ]

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email__iexact=normalized, is_active=True).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        return normalized

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        import uuid
        email = validated_data["email"].lower().strip()
        name = validated_data.get("name", "").strip()

        # If an unverified/inactive account already exists with this email, update credentials
        existing_user = User.objects.filter(email__iexact=email, is_active=False).first()
        if existing_user:
            existing_user.first_name = name
            existing_user.phone = validated_data.get("phone", "")
            existing_user.set_password(validated_data["password"])
            existing_user.is_email_verified = False
            existing_user.save()
            return existing_user

        generated_username = f"user_{uuid.uuid4().hex[:15]}"
        user = User.objects.create_user(
            username=generated_username,
            email=email,
            phone=validated_data.get("phone"),
            password=validated_data["password"],
            first_name=name,
            is_active=False,
            is_email_verified=False,
        )

        return user


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
                pass

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
    name = serializers.CharField(source='first_name', read_only=True)

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
            "user_type",
            "date_joined",
        ]
        read_only_fields = fields