from decimal import Decimal
from rest_framework import serializers
from cart.models import Cart, CartItem
from products.models import Product


class CartProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
        default=None,
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "discount_price",
            "image",
            "category_name",
            "stock",
            "is_available",
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            try:
                return request.build_absolute_uri(obj.image.url)
            except Exception:
                return obj.image.url
        return obj.image.url


class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
    )
    sub_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = ["id", "product", "quantity", "sub_total"]

    def validate(self, attrs):
        if self.instance is None and "product" not in attrs:
            raise serializers.ValidationError({"product": "This field is required."})

        product = attrs.get("product") or (self.instance.product if self.instance else None)
        quantity = attrs.get("quantity") if "quantity" in attrs else (self.instance.quantity if self.instance else 1)

        if quantity is not None and quantity < 1:
            raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})

        if product:
            if not product.is_available:
                raise serializers.ValidationError({"product": f"{product.name} is currently unavailable."})
            if product.stock < quantity:
                raise serializers.ValidationError({"quantity": f"Only {product.stock} item(s) available in stock."})

        return attrs

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Return full product details expected by the frontend
        representation["product"] = CartProductSerializer(
            instance.product,
            context=self.context,
        ).data
        # Retain product_id for backward compatibility
        representation["product_id"] = instance.product_id
        return representation


class CartSerializer(serializers.ModelSerializer):
    cart_items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "created_at", "cart_items", "total_price", "total_items"]

    def get_total_price(self, obj):
        items = obj.cart_items.all()
        return sum((item.sub_total for item in items), Decimal("0.00"))

    def get_total_items(self, obj):
        items = obj.cart_items.all()
        return sum(item.quantity for item in items)
