from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)

from api.v1.products.permissions import IsOwner
from coupons.models import Coupon, CouponUsage
from orders.models import Order
from payments.models import Payment
from .serializers import CouponSerializer, CouponUsageSerializer


# =====================================================
# Coupons
# =====================================================

@extend_schema(
    tags=["Coupons"],
    summary="List Active Coupons",
    description="Returns a list of active coupons that are currently valid.",
    responses={200: CouponSerializer(many=True)},
)
class CouponListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CouponSerializer

    def get_queryset(self):
        now = timezone.now()

        return (
            Coupon.objects.filter(
                is_active=True,
                valid_from__lte=now,
                valid_to__gte=now
            )
            .order_by("-created_at")
        )


@extend_schema(
    tags=["Coupons"],
    summary="Apply Coupon",
    description="Applies a coupon to the authenticated user's order, records coupon usage, and updates the payable order total.",
    parameters=[
        OpenApiParameter(
            name="order_id",
            type=int,
            location=OpenApiParameter.PATH,
            description="ID of the order.",
        ),
    ],
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "example": "SAVE20",
                }
            },
            "required": ["code"],
        }
    },
    responses={200: dict},
)
class ApplyCouponView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):

        code = request.data.get("code")

        if not code or not str(code).strip():
            raise ValidationError("Coupon code is required.")

        code = str(code).strip().upper()

        try:
            coupon = (
                Coupon.objects
                .select_for_update()
                .get(
                    code=code,
                    is_active=True
                )
            )
        except Coupon.DoesNotExist:
            raise ValidationError("Invalid coupon.")

        if not coupon.is_valid():
            raise ValidationError("Coupon has expired or is unavailable.")

        try:
            order = (
                Order.objects
                .select_for_update()
                .get(
                    id=order_id,
                    user=request.user
                )
            )
        except Order.DoesNotExist:
            raise ValidationError("Order not found.")

        if order.status != "PENDING":
            raise ValidationError("Coupons can only be applied to pending orders.")

        if Payment.objects.filter(order=order).exists():
            raise ValidationError("Cannot apply coupon to an order with an existing payment.")

        if CouponUsage.objects.filter(order=order).exists():
            raise ValidationError("A coupon has already been applied to this order.")

        if CouponUsage.objects.filter(user=request.user, coupon=coupon).exists():
            raise ValidationError("You have already used this coupon.")

        if order.total_price < coupon.minimum_order_amount:
            raise ValidationError(
                f"Minimum order amount is ₹{coupon.minimum_order_amount}."
            )

        original_amount = order.total_price

        if coupon.discount_type == "PERCENTAGE":
            discount = (
                original_amount * coupon.discount_value
            ) / Decimal("100")

            if (
                coupon.maximum_discount and
                discount > coupon.maximum_discount
            ):
                discount = coupon.maximum_discount

        else:
            discount = min(coupon.discount_value, original_amount)

        final_total = max(Decimal("0.00"), original_amount - discount)

        # Persist updated order total
        order.total_price = final_total
        order.save(update_fields=["total_price"])

        # Persist coupon usage tracking record
        CouponUsage.objects.create(
            user=request.user,
            coupon=coupon,
            order=order,
            order_amount=original_amount,
            discount_amount=discount,
        )

        return Response(
            {
                "coupon": coupon.code,
                "discount": discount,
                "final_total": final_total,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Coupons"],
    summary="Coupon Usage History",
    description="Returns a list of coupons previously applied by the authenticated user.",
    responses={200: CouponUsageSerializer(many=True)},
)
class CouponUsageListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CouponUsageSerializer

    def get_queryset(self):
        return (
            CouponUsage.objects
            .filter(user=self.request.user)
            .select_related("coupon", "order")
            .order_by("-applied_at")
        )


@extend_schema(
    tags=["Coupons"],
    summary="Create Coupon",
    description="Creates a new coupon. Accessible only to the owner/admin.",
    request=CouponSerializer,
    responses={201: CouponSerializer},
)
class CouponCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


@extend_schema(
    tags=["Coupons"],
    summary="Update Coupon",
    description="Updates an existing coupon. Accessible only to the owner/admin.",
    request=CouponSerializer,
    responses={200: CouponSerializer},
)
class CouponUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


@extend_schema(
    tags=["Coupons"],
    summary="Delete Coupon",
    description="Deletes an existing coupon. Accessible only to the owner/admin.",
    responses={204: None},
)
class CouponDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    queryset = Coupon.objects.all()

@extend_schema(
    tags=["Coupons"],
    summary="Admin List Coupons",
    description="Returns a list of all coupons (active and inactive) for admin management.",
    responses={200: CouponSerializer(many=True)},
)
class AdminCouponListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = CouponSerializer

    def get_queryset(self):
        return Coupon.objects.all().order_by("-created_at")