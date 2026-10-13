from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError

from reviews.models import Review
from orders.models import OrderItem
from .serializers import ReviewSerializer

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
)


@extend_schema(
    tags=["Reviews"],
    summary="Create Review",
    description="Creates a review for a product purchased by the authenticated user.",
    request=ReviewSerializer,
    responses={201: ReviewSerializer},
)
class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]

        # Check if the user has already reviewed this product
        if Review.objects.filter(
            user=self.request.user,
            product=product
        ).exists():
            raise ValidationError(
                "You have already reviewed this product."
            )

        # Check if the user has purchased the product
        has_purchased = OrderItem.objects.filter(
            order__user=self.request.user,
            order__status="DELIVERED",
            product=product
        ).exists()

        if not has_purchased:
            raise ValidationError(
                "You can only review products you have purchased."
            )

        serializer.save(user=self.request.user)


@extend_schema(
    tags=["Reviews"],
    summary="List Product Reviews",
    description="Returns a list of reviews for a specific product.",
    parameters=[
        OpenApiParameter(
            name="product_id",
            type=int,
            location=OpenApiParameter.PATH,
            description="ID of the product.",
        ),
    ],
    responses={200: ReviewSerializer(many=True)},
)
class ProductReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]
    queryset = Review.objects.none()

    def get_queryset(self):
        product_id = self.kwargs.get("product_id")
        if not product_id:
            return Review.objects.none()

        return (
            Review.objects
            .filter(product_id=product_id)
            .select_related("user", "product")
            .order_by("-created_at")
        )


@extend_schema(
    tags=["Reviews"],
    summary="Update Review",
    description="Updates a review created by the authenticated user.",
    request=ReviewSerializer,
    responses={200: ReviewSerializer},
)
class UpdateReviewView(generics.UpdateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Review.objects
            .filter(user=self.request.user)
            .select_related("product")
        )


@extend_schema(
    tags=["Reviews"],
    summary="Delete Review",
    description="Deletes a review created by the authenticated user.",
    responses={204: None},
)
class DeleteReviewView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)