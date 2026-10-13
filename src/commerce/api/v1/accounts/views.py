import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import PasswordResetOTP
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
)
from rest_framework import permissions

from accounts.throttles import ForgotPasswordThrottle
from .serializers import (
    RegisterSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    EmailTokenObtainPairSerializer,
    UserProfileSerializer,
)
from accounts.email import send_password_reset_email
from django.core.mail import BadHeaderError
import smtplib

@extend_schema(
    tags=["Authentication"],
    summary="Register User",
    description="Creates a new customer account.",
    request=RegisterSerializer,
    responses={201: RegisterSerializer},
)
class SignupView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            {
                "message": "User registered successfully.",
                "success": True,
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
    summary="Reset Password",
    description="Verifies the OTP and resets the user's password.",
    request=ResetPasswordSerializer,
    tags=["Authentication"],
)
class ResetPasswordView(APIView):
    """
    Verify the OTP and reset the user's password.
    """

    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]
        password = serializer.validated_data["password"]

        user = User.objects.filter(
            email__iexact=email.strip()
        ).first()

        if not user:
            return Response(
                {
                    "detail": "Invalid OTP or email."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = (
            PasswordResetOTP.objects
            .select_for_update()
            .filter(
                user=user,
                is_verified=False,
            )
            .order_by("-created_at")
            .first()
        )

        if otp_record is None:
            return Response(
                {
                    "detail": "Invalid OTP or email."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp_record.verify(otp):
            return Response(
                {
                    "detail": "Invalid or expired OTP."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])

        PasswordResetOTP.objects.filter(
            user=user
        ).delete()

        # Invalidate all outstanding JWT refresh tokens for this user
        # so that previously-issued tokens cannot be used after password reset.
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
                "detail": "Password reset successfully."
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
        queryset = User.objects.all().order_by("-date_joined")
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