from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from wishlist.models import Wishlist
from .serializers import WishlistSerializer

from drf_spectacular.utils import extend_schema


@extend_schema(
    tags=["Wishlist"],
    summary="Add Product to Wishlist",
    description="Adds a product to the authenticated user's wishlist.",
    request=WishlistSerializer,
    responses={201: WishlistSerializer},
)
class CreateWishlistView(generics.CreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]

        # Prevent duplicate wishlist items
        if Wishlist.objects.filter(
            user=self.request.user,
            product=product
        ).exists():
            raise ValidationError(
                "Product is already in your wishlist."
            )

        serializer.save(user=self.request.user)


@extend_schema(
    tags=["Wishlist"],
    summary="My Wishlist",
    description="Returns the authenticated user's wishlist.",
    responses={200: WishlistSerializer(many=True)},
)
class WishlistListView(generics.ListAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    queryset = Wishlist.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return Wishlist.objects.none()

        return (
            Wishlist.objects
            .filter(user=self.request.user)
            .select_related("product")
            .order_by("-created_at")
        )


@extend_schema(
    tags=["Wishlist"],
    summary="Remove Product from Wishlist",
    description="Removes a product from the authenticated user's wishlist.",
    responses={204: None},
)
class DeleteWishlistView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Wishlist.objects
            .filter(user=self.request.user)
            .select_related("product")
        )