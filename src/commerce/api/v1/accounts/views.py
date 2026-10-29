import logging
import secrets
import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.email import send_password_reset_email, send_verification_email
from accounts.models import EmailVerificationOTP, PasswordResetOTP, PhoneVerificationOTP
from accounts.services.sms import get_sms_provider
from accounts.throttles import (
    ForgotPasswordThrottle,
    RequestPhoneOTPThrottle,
    ResendPhoneOTPThrottle,
    ResendVerificationThrottle,
    VerifyOTPThrottle,
    VerifyPhoneOTPThrottle,
)
from accounts.tokens import generate_reset_token, verify_reset_token
from accounts.utils.phone import mask_phone_number
from api.v1.products.permissions import IsOwner
from .serializers import (
    EmailTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    RegisterSerializer,
    RequestPhoneOTPSerializer,
    ResendPhoneOTPSerializer,
    ResendVerificationOTPSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
    VerifyEmailSerializer,
    VerifyOTPSerializer,
    VerifyPhoneOTPSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()


@extend_schema(
    tags=["Authentication"],
    summary="Register User",
    description="Registers a new customer account and sends an email verification OTP. The User database record is NOT created until email is verified.",
    request=RegisterSerializer,
    responses={201: RegisterSerializer},
)
class SignupView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        email = data["email"]
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        password = data["password"]

        # If an unverified user exists from the legacy flow, remove it
        User.objects.filter(email__iexact=email, is_active=False, is_email_verified=False).delete()

        # Generate email verification challenge and store pending registration data
        otp_record, plain_otp = EmailVerificationOTP.create_otp(
            email=email,
            name=name,
            phone=phone,
            password=password,
        )

        try:
            send_verification_email(email=email, name=name, otp=plain_otp)
        except Exception as e:
            logger.error("Failed to send verification email to %s: %s", email, e)

        return Response(
            {
                "message": "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
                "success": True,
                "email": email,
                "requires_verification": True,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Verify Email Address",
    description="Validates a 6-digit registration OTP, creates and activates the user account, and returns JWT credentials.",
    request=VerifyEmailSerializer,
    responses={200: "Email verified successfully."},
)
class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [VerifyOTPThrottle]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        if User.objects.filter(email__iexact=email, is_active=True, is_email_verified=True).exists():
            return Response(
                {"detail": "Email is already verified. Please sign in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            otp_record = (
                EmailVerificationOTP.objects.select_for_update()
                .filter(email__iexact=email, is_verified=False)
                .order_by("-created_at")
                .first()
            )

            # Fallback for legacy records attached by user FK
            if not otp_record:
                legacy_user = User.objects.filter(email__iexact=email).first()
                if legacy_user:
                    otp_record = (
                        EmailVerificationOTP.objects.select_for_update()
                        .filter(user=legacy_user, is_verified=False)
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

            # Create the User account in database now that email is verified
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                generated_username = f"user_{uuid.uuid4().hex[:15]}"
                user = User(
                    username=generated_username,
                    email=otp_record.email,
                    first_name=otp_record.name,
                    phone=otp_record.phone,
                    is_active=True,
                    is_email_verified=True,
                )
                user.password = otp_record.password_hash
                user.save()
            else:
                user.is_active = True
                user.is_email_verified = True
                if otp_record.password_hash:
                    user.password = otp_record.password_hash
                if otp_record.name:
                    user.first_name = otp_record.name
                if otp_record.phone:
                    user.phone = otp_record.phone
                user.save()

            # Check if phone number was pre-verified during onboarding
            if otp_record.phone:
                has_phone_verified = PhoneVerificationOTP.objects.filter(
                    phone=otp_record.phone,
                    is_verified=True,
                ).exists()
                if has_phone_verified:
                    user.is_phone_verified = True
                    user.save(update_fields=["is_phone_verified"])

            # Clean up all verification OTPs for this email / user
            EmailVerificationOTP.objects.filter(email__iexact=email).delete()
            if user:
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
                    "is_email_verified": user.is_email_verified,
                    "is_phone_verified": user.is_phone_verified,
                    "user_type": user.user_type,
                },
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Resend Verification OTP",
    description="Dispatches a fresh 6-digit email verification OTP to a pending registration.",
    request=ResendVerificationOTPSerializer,
    responses={200: "A new verification code has been sent."},
)
class ResendVerificationOTPView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        serializer = ResendVerificationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()

        if User.objects.filter(email__iexact=email, is_active=True, is_email_verified=True).exists():
            return Response(
                {"detail": "This email is already verified. Please sign in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check pending OTP record
        pending = (
            EmailVerificationOTP.objects.filter(
                email__iexact=email,
                is_verified=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not pending:
            legacy_user = User.objects.filter(email__iexact=email, is_active=False).first()
            if legacy_user:
                otp_record, plain_otp = EmailVerificationOTP.create_otp(
                    user=legacy_user,
                    email=legacy_user.email,
                    name=legacy_user.first_name,
                    phone=legacy_user.phone,
                    password_hash=legacy_user.password,
                )
                try:
                    send_verification_email(email=legacy_user.email, name=legacy_user.first_name, otp=plain_otp)
                except Exception as e:
                    logger.error("Failed to resend verification email to %s: %s", legacy_user.email, e)

                return Response(
                    {"message": "A new verification code has been sent to your email."},
                    status=status.HTTP_200_OK,
                )

            return Response(
                {"detail": "No pending registration found for this email. Please register first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record, plain_otp = EmailVerificationOTP.create_otp(
            email=pending.email,
            name=pending.name,
            phone=pending.phone,
            password_hash=pending.password_hash,
        )

        try:
            send_verification_email(email=pending.email, name=pending.name, otp=plain_otp)
        except Exception as e:
            logger.error("Failed to resend verification email to %s: %s", pending.email, e)
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


# Forgot Password and Reset Password Views


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
            otp_obj, otp = PasswordResetOTP.create_otp(user)

            try:
                send_password_reset_email(
                    user=user,
                    otp=otp,
                )
            except Exception as exc:
                otp_obj.delete()
                logger.error(
                    "Failed to send password reset email for user id %s: %s",
                    user.id,
                    type(exc).__name__,
                )
                return Response(
                    {"detail": "Unable to dispatch password reset email. Please try again shortly."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        queryset = User.objects.filter(user_type="customer", is_active=True).order_by("-date_joined")
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


# Phone Verification API Endpoints


@extend_schema(
    tags=["Authentication"],
    summary="Request Phone Verification OTP",
    description="Dispatches a 6-digit SMS OTP to verify the user's phone number.",
    request=RequestPhoneOTPSerializer,
    responses={200: "Verification code sent successfully."},
)
class RequestPhoneOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RequestPhoneOTPThrottle]

    def post(self, request):
        serializer = RequestPhoneOTPSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["normalized_phone"]
        user = request.user if (request.user and request.user.is_authenticated) else None
        session_token = secrets.token_hex(32) if user is None else ""

        with transaction.atomic():
            challenge, plain_otp = PhoneVerificationOTP.create_challenge(
                phone=phone,
                user=user,
                session_token=session_token,
            )

            sms_provider = get_sms_provider()
            sms_text = f"Your DjangoMart verification code is {plain_otp}. Valid for 5 minutes. Do not share this code."
            result = sms_provider.send_sms(to_phone=phone, message=sms_text)

            if not result.success:
                challenge.delete()
                logger.error("SMS dispatch failed for %s: %s", mask_phone_number(phone), result.error_message)
                return Response(
                    {
                        "detail": "Unable to send verification SMS at this time. Please verify your phone number and try again.",
                        "success": False,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(
            {
                "success": True,
                "message": "Verification code sent successfully.",
                "phone": mask_phone_number(phone),
                "session_token": session_token,
                "cooldown_seconds": challenge.cooldown_remaining(),
                "expires_in": getattr(settings, "OTP_EXPIRY_SECONDS", 300),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Verify Phone Number OTP",
    description="Verifies the 6-digit SMS OTP and marks the phone number as verified.",
    request=VerifyPhoneOTPSerializer,
    responses={200: "Phone number verified successfully."},
)
class VerifyPhoneOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [VerifyPhoneOTPThrottle]

    def post(self, request):
        serializer = VerifyPhoneOTPSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        otp = serializer.validated_data["otp"]
        phone = serializer.validated_data.get("normalized_phone")
        session_token = serializer.validated_data.get("session_token", "").strip()
        user = request.user if (request.user and request.user.is_authenticated) else None

        with transaction.atomic():
            query = PhoneVerificationOTP.objects.select_for_update().filter(is_verified=False)
            if user:
                query = query.filter(user=user)
                if phone:
                    query = query.filter(phone=phone)
            elif session_token:
                query = query.filter(session_token=session_token)
            elif phone:
                query = query.filter(phone=phone)
            else:
                return Response(
                    {"detail": "Unable to identify verification session."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            challenge = query.order_by("-created_at").first()

            if not challenge:
                return Response(
                    {"detail": "No active verification code found. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if challenge.is_expired():
                return Response(
                    {"detail": "Verification code has expired. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if challenge.attempts >= challenge.max_attempts:
                return Response(
                    {"detail": "Maximum verification attempts exceeded. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not challenge.verify(otp):
                remaining = max(0, challenge.max_attempts - challenge.attempts)
                if remaining == 0:
                    return Response(
                        {"detail": "Too many failed attempts. This code is now invalid. Please request a new code."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(
                    {"detail": f"Invalid verification code. {remaining} attempt(s) remaining."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Verification succeeded
            if user:
                user.phone = challenge.phone
                user.is_phone_verified = True
                user.save(update_fields=["phone", "is_phone_verified"])

            return Response(
                {
                    "success": True,
                    "message": "Phone number verified successfully.",
                    "phone": challenge.phone,
                    "is_phone_verified": True,
                    "session_token": challenge.session_token,
                },
                status=status.HTTP_200_OK,
            )


@extend_schema(
    tags=["Authentication"],
    summary="Resend Phone Verification OTP",
    description="Resends a 6-digit SMS verification OTP respecting cooldown limits.",
    request=ResendPhoneOTPSerializer,
    responses={200: "A new verification code has been sent."},
)
class ResendPhoneOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendPhoneOTPThrottle]

    def post(self, request):
        serializer = ResendPhoneOTPSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data.get("normalized_phone")
        session_token = serializer.validated_data.get("session_token", "").strip()
        user = request.user if (request.user and request.user.is_authenticated) else None

        query = PhoneVerificationOTP.objects.filter(is_verified=False)
        if user:
            query = query.filter(user=user)
            if phone:
                query = query.filter(phone=phone)
        elif session_token:
            query = query.filter(session_token=session_token)
        elif phone:
            query = query.filter(phone=phone)
        else:
            return Response(
                {"detail": "Unable to identify verification session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        challenge = query.order_by("-created_at").first()

        if challenge and not challenge.can_resend():
            remaining = challenge.cooldown_remaining()
            return Response(
                {
                    "detail": f"Please wait {remaining} seconds before requesting a new code.",
                    "cooldown_remaining": remaining,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        target_phone = challenge.phone if challenge else phone
        if not target_phone:
            return Response(
                {"detail": "No phone number found to resend verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_session_token = session_token or (secrets.token_hex(32) if user is None else "")

        with transaction.atomic():
            new_challenge, plain_otp = PhoneVerificationOTP.create_challenge(
                phone=target_phone,
                user=user,
                session_token=new_session_token,
            )

            sms_provider = get_sms_provider()
            sms_text = f"Your DjangoMart verification code is {plain_otp}. Valid for 5 minutes. Do not share this code."
            result = sms_provider.send_sms(to_phone=target_phone, message=sms_text)

            if not result.success:
                new_challenge.delete()
                logger.error("SMS dispatch failed on resend for %s: %s", mask_phone_number(target_phone), result.error_message)
                return Response(
                    {
                        "detail": "Unable to send verification SMS at this time. Please try again later.",
                        "success": False,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(
            {
                "success": True,
                "message": "A new verification code has been sent.",
                "phone": mask_phone_number(target_phone),
                "session_token": new_session_token,
                "cooldown_seconds": new_challenge.cooldown_remaining(),
                "expires_in": getattr(settings, "OTP_EXPIRY_SECONDS", 300),
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Authentication"],
    summary="Get Phone Verification Status",
    description="Returns the phone number and verification status of the authenticated user.",
    responses={200: "Phone verification status returned."},
)
class PhoneVerificationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "phone": request.user.phone,
                "masked_phone": mask_phone_number(request.user.phone),
                "is_phone_verified": request.user.is_phone_verified,
            },
            status=status.HTTP_200_OK,
        )

