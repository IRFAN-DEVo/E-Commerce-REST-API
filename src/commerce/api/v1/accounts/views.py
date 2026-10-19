import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import PasswordResetOTP, EmailVerificationOTP
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
)
from rest_framework import permissions

from accounts.throttles import ForgotPasswordThrottle, VerifyOTPThrottle, ResendVerificationThrottle
from accounts.tokens import generate_reset_token, verify_reset_token
from .serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendVerificationOTPSerializer,
    ForgotPasswordSerializer,
    VerifyOTPSerializer,
    ResetPasswordSerializer,
    EmailTokenObtainPairSerializer,
    UserProfileSerializer,
)
from accounts.email import send_password_reset_email, send_verification_email
from django.core.mail import BadHeaderError
import smtplib

@extend_schema(
    tags=["Authentication"],
    summary="Register User",
    description="Registers a new customer account and sends an email verification OTP.",
    request=RegisterSerializer,
    responses={201: RegisterSerializer},
)
class SignupView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Generate email verification challenge and dispatch email
        otp_record, plain_otp = EmailVerificationOTP.create_otp(user)
        try:
            send_verification_email(user=user, otp=plain_otp)
        except Exception as e:
            logger.error("Failed to send verification email to %s: %s", user.email, e)

        return Response(
            {
                "message": "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
                "success": True,
                "email": user.email,
                "requires_verification": True,
                "user": {
                    "id": user.id,
                    "name": user.first_name,
                    "email": user.email,
                    "phone": user.phone,
                    "user_type": user.user_type,
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Verify Email Address",
    description="Validates a 6-digit registration OTP, activates the user, and returns JWT credentials.",
    request=VerifyEmailSerializer,
    responses={200: "Email verified successfully."},
)
class VerifyEmailView(APIView):
    throttle_classes = [VerifyOTPThrottle]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        User = get_user_model()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid email or verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_active and getattr(user, "is_email_verified", False):
            return Response(
                {"detail": "Email is already verified. Please sign in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            otp_record = (
                EmailVerificationOTP.objects.select_for_update()
                .filter(user=user, is_verified=False)
                .order_by("-created_at")
                .first()
            )

            if not otp_record:
                return Response(
                    {"detail": "No active verification code found. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp_record.is_expired():
                return Response(
                    {"detail": "Verification code has expired. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp_record.attempts >= 5:
                return Response(
                    {"detail": "Too many failed attempts. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not otp_record.verify(otp):
                remaining = max(0, 5 - otp_record.attempts)
                if remaining == 0:
                    return Response(
                        {"detail": "Too many failed attempts. This code is now invalid. Please request a new code."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(
                    {"detail": f"Invalid verification code. {remaining} attempt(s) remaining."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Mark user account as active and verified
            user.is_active = True
            user.is_email_verified = True
            user.save(update_fields=["is_active", "is_email_verified"])

            # Clean up all verification OTPs for this user
            EmailVerificationOTP.objects.filter(user=user).delete()

        # Issue JWT tokens for seamless onboarding
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Email verified successfully.",
                "success": True,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "name": user.first_name,
                    "email": user.email,
                    "phone": user.phone,
                    "user_type": user.user_type,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Resend Verification OTP",
    description="Dispatches a fresh 6-digit email verification OTP to an unverified account.",
    request=ResendVerificationOTPSerializer,
    responses={200: "A new verification code has been sent."},
)
class ResendVerificationOTPView(APIView):
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        serializer = ResendVerificationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        User = get_user_model()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If an account is pending verification, a new code has been sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_active and getattr(user, "is_email_verified", False):
            return Response(
                {"detail": "This email address is already verified. Please sign in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate fresh OTP and clear previous unverified challenges
        otp_record, plain_otp = EmailVerificationOTP.create_otp(user)

        try:
            send_verification_email(user=user, otp=plain_otp)
        except Exception as e:
            logger.error("Failed to resend verification email to %s: %s", user.email, e)
            return Response(
                {"detail": "Failed to dispatch verification email. Please try again shortly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "A new verification code has been sent to your email."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["Authentication"],
        summary="Login",
        description="Authenticates a user and returns JWT access and refresh tokens.",
    )
)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

@extend_schema(
    tags=["Authentication"],
    summary="User Profile",
    description="Returns the authenticated user's profile information including user_type.",
    responses={200: UserProfileSerializer},
)
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)



#Forgot Password and Reset Password Views


logger = logging.getLogger(__name__)

User = get_user_model()


@extend_schema(
    summary="Forgot Password",
    description="Sends a one-time password (OTP) to the user's email if an account exists.",
    request=ForgotPasswordSerializer,
    tags=["Authentication"],
)
class ForgotPasswordView(APIView):
    """
    Send a password reset OTP to the user's email.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user = User.objects.filter(
            email__iexact=email.strip()
        ).first()

        # Never reveal whether the email exists.
        if user:
            _, otp = PasswordResetOTP.create_otp(user)

            try:
                send_password_reset_email(
                    user=user,
                    otp=otp,
                )
            except Exception as exc:
                logger.error(
                    "Failed to send password reset email for user id %s: %s",
                    user.id,
                    type(exc).__name__,
                )

        return Response(
            {
                "detail": (
                    "If an account with that email exists, "
                    "an OTP has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    summary="Verify OTP",
    description="Validates a six-digit OTP and issues a short-lived, single-use password reset authorization token.",
    request=VerifyOTPSerializer,
    tags=["Authentication"],
)
class VerifyOTPView(APIView):
    """
    Dedicated OTP verification endpoint.
    Validates challenge, enforces expiration and attempt limits,
    and returns a short-lived reset authorization token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [VerifyOTPThrottle]

    @transaction.atomic
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        user = User.objects.filter(email__iexact=email.strip()).first()
        if not user:
            return Response(
                {"detail": "Invalid OTP or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = (
            PasswordResetOTP.objects
            .select_for_update()
            .filter(user=user, is_verified=False)
            .order_by("-created_at")
            .first()
        )

        if otp_record is None:
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp_record.verify(otp):
            if otp_record.attempts >= 5:
                return Response(
                    {"detail": "Maximum verification attempts exceeded. Please request a new OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_token = generate_reset_token(user, otp_record)

        return Response(
            {
                "detail": "OTP verified successfully.",
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    summary="Reset Password",
    description="Resets the user's password using the single-use reset authorization token or direct OTP verification.",
    request=ResetPasswordSerializer,
    tags=["Authentication"],
)
class ResetPasswordView(APIView):
    """
    Confirm password reset.
    Validates the single-use authorization token (or verified OTP), updates the password,
    invalidates all pending OTP challenges, and blacklists all outstanding JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_token = serializer.validated_data.get("reset_token")
        password = serializer.validated_data["password"]

        if reset_token:
            try:
                user, otp_record = verify_reset_token(reset_token)
            except ValueError as e:
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            email = serializer.validated_data.get("email")
            otp = serializer.validated_data.get("otp")

            user = User.objects.filter(email__iexact=email.strip()).first()
            if not user:
                return Response(
                    {"detail": "Invalid OTP or email."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp_record = (
                PasswordResetOTP.objects
                .select_for_update()
                .filter(user=user, is_verified=False)
                .order_by("-created_at")
                .first()
            )

            if otp_record is None or not otp_record.verify(otp):
                return Response(
                    {"detail": "Invalid or expired OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user.set_password(password)
        user.save(update_fields=["password"])

        # Delete all OTP records for this user (preventing reuse of token or OTP)
        PasswordResetOTP.objects.filter(user=user).delete()

        # Invalidate all outstanding JWT refresh tokens for this user
        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )
            outstanding = OutstandingToken.objects.filter(user=user)
            for token in outstanding:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            logger.warning(
                "Failed to blacklist tokens for user %s after password reset",
                user.id,
            )

        return Response(
            {
                "detail": "Password reset successfully. Please sign in with your new password."
            },
            status=status.HTTP_200_OK,
        )


from api.v1.products.permissions import IsOwner
from rest_framework import generics
from django.db.models import Q

@extend_schema(
    tags=["Authentication"],
    summary="Admin List Customers",
    description="Returns a list of all registered customers for admin management. Supports search query.",
    responses={200: UserProfileSerializer(many=True)},
)
class AdminCustomerListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        queryset = User.objects.filter(user_type="customer").order_by("-date_joined")
        search_query = self.request.query_params.get("search", None)
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query)
            )
        return queryset

@extend_schema(
    tags=["Authentication"],
    summary="Admin Customer Details",
    description="Returns details for a specific customer (Admin only).",
    responses={200: UserProfileSerializer},
)
class AdminCustomerDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = UserProfileSerializer
    queryset = User.objects.all()
    lookup_field = "pk"