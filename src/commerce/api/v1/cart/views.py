from .serializers import CartSerializer, CartItemSerializer
from rest_framework import generics
from cart.models import Cart, CartItem
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, OpenApiResponse


@extend_schema(
    tags=["Cart"],
    summary="View Cart",
    description="Returns the authenticated user's cart.",
    responses={
        200: CartSerializer,
        401: OpenApiResponse(description="Authentication credentials were not provided.")
    }
)
class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        cart, _ = (
            Cart.objects
            .prefetch_related("cart_items__product__category")
            .get_or_create(user=self.request.user)
        )
        return cart


@extend_schema(
    tags=["Cart"],
    summary="Add Item to Cart",
    description="Adds a product to the authenticated user's cart. If the product already exists in the cart, its quantity is increased.",
    request=CartItemSerializer,
    responses={
        201: CartItemSerializer,
        400: OpenApiResponse(description="Invalid request or insufficient stock."),
        401: OpenApiResponse(description="Authentication credentials were not provided.")
    }
)

@extend_schema(
    tags=["Cart"],
    summary="Add Item to Cart",
    description="Adds a product to the authenticated user's cart. If the product already exists in the cart, its quantity is increased.",
    request=CartItemSerializer,
    responses={
        201: CartItemSerializer,
        400: OpenApiResponse(description="Invalid request or insufficient stock."),
        401: OpenApiResponse(description="Authentication credentials were not provided.")
    }
)
class AddCartItemView(generics.CreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        product = serializer.validated_data.get('product')
        quantity = serializer.validated_data.get('quantity', 1)

        if not product.is_available:
            raise ValidationError(f"{product.name} is currently unavailable.")

        if product.stock < quantity:
            raise ValidationError("Not enough stock available.")

        try:
            cart_item = CartItem.objects.get(cart=cart, product=product)
            # Item already exists — update quantity
            if product.stock < cart_item.quantity + quantity:
                raise ValidationError(f"Only {product.stock} item(s) available in stock.")
            cart_item.quantity += quantity
            cart_item.save()
        except CartItem.DoesNotExist:
            # New item — save via serializer
            serializer.save(cart=cart)



@extend_schema(
    tags=["Cart"],
    summary="Retrieve, Update or Delete Cart Item",
    description="Retrieve, update the quantity of, or delete a specific cart item belonging to the authenticated user.",
    request=CartItemSerializer,
    responses={
        200: CartItemSerializer,
        400: OpenApiResponse(description="Invalid request."),
        401: OpenApiResponse(description="Authentication credentials were not provided."),
        404: OpenApiResponse(description="Cart item not found.")
    }
)
class CartItemView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            CartItem.objects
            .filter(cart__user=self.request.user)
            .select_related("product__category")
        )



@extend_schema(
    tags=["Cart"],
    summary="Delete Cart Item",
    description="Deletes a specific cart item belonging to the authenticated user.",
    responses={
        204: OpenApiResponse(description="Cart item deleted successfully."),
        401: OpenApiResponse(description="Authentication credentials were not provided."),
        404: OpenApiResponse(description="Cart item not found.")
    }
)
class DeleteCartItemView(generics.DestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            CartItem.objects
            .filter(cart__user=self.request.user)
            .select_related("product")
        )
    