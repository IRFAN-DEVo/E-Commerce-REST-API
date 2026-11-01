from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound

from wishlist.models import Wishlist
from products.models import Product
from .serializers import WishlistSerializer

from drf_spectacular.utils import extend_schema


@extend_schema(
    tags=["Wishlist"],
    summary="Add Product to Wishlist",
    description="Adds an active product to the authenticated user's wishlist.",
    request=WishlistSerializer,
    responses={201: WishlistSerializer},
)
class CreateWishlistView(generics.CreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]

        if not getattr(product, "is_available", True):
            raise ValidationError("This product is currently unavailable.")

        # Prevent duplicate wishlist items for the authenticated user
        if Wishlist.objects.filter(
            user=self.request.user,
            product=product
        ).exists():
            raise ValidationError("Product is already in your wishlist.")

        serializer.save(user=self.request.user)


@extend_schema(
    tags=["Wishlist"],
    summary="My Wishlist",
    description="Returns the authenticated user's personal wishlist.",
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
            .select_related("product__category", "product__brand")
            .prefetch_related("product__images")
            .order_by("-created_at")
        )


@extend_schema(
    tags=["Wishlist"],
    summary="Remove Product from Wishlist",
    description="Removes a product from the authenticated user's wishlist by wishlist ID or product ID.",
    responses={204: None},
)
class DeleteWishlistView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        pk = self.kwargs.get("pk")
        # Support removing by either wishlist entry primary key or product id
        item = (
            Wishlist.objects.filter(user=self.request.user, id=pk).first()
            or Wishlist.objects.filter(user=self.request.user, product_id=pk).first()
        )
        if not item:
            raise NotFound("Wishlist item not found in your wishlist.")
        self.check_object_permissions(self.request, item)
        return item


@extend_schema(
    tags=["Wishlist"],
    summary="Check if Product is in Wishlist",
    description="Checks whether a given product is currently in the authenticated user's wishlist.",
    responses={
        200: {
            "type": "object",
            "properties": {
                "is_wishlisted": {"type": "boolean"},
                "wishlist_id": {"type": "integer", "nullable": True},
                "product_id": {"type": "integer"},
            },
        }
    },
)
class CheckWishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        item = Wishlist.objects.filter(user=request.user, product_id=product_id).first()
        return Response(
            {
                "is_wishlisted": item is not None,
                "wishlist_id": item.id if item else None,
                "product_id": product_id,
            },
            status=status.HTTP_200_OK,
        )
