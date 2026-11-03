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
    has_clothing_variations = serializers.BooleanField(read_only=True)

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
            "has_clothing_variations",
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
    # Optional clothing variation fields
    color = serializers.CharField(required=False, write_only=True, allow_blank=True, allow_null=True)
    size = serializers.CharField(required=False, write_only=True, allow_blank=True, allow_null=True)
    selected_color = serializers.CharField(required=False, write_only=True, allow_blank=True, allow_null=True)
    selected_size = serializers.CharField(required=False, write_only=True, allow_blank=True, allow_null=True)
    variations = serializers.DictField(required=False, write_only=True, allow_null=True)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "quantity",
            "sub_total",
            "color",
            "size",
            "selected_color",
            "selected_size",
            "variations",
        ]

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

            # Variation validation: verify product supports clothing variations
            color = attrs.get("color") or attrs.get("selected_color")
            size = attrs.get("size") or attrs.get("selected_size")
            variations = attrs.get("variations") or {}
            if not color and isinstance(variations, dict):
                color = variations.get("color")
            if not size and isinstance(variations, dict):
                size = variations.get("size")

            has_clothing_vars = getattr(product, "has_clothing_variations", False)
            if (color or size or variations) and not has_clothing_vars:
                raise serializers.ValidationError(
                    {"variations": f"Product '{product.name}' does not support clothing variations (color/size)."}
                )

        return attrs

    def create(self, validated_data):
        for k in ("color", "size", "selected_color", "selected_size", "variations"):
            validated_data.pop(k, None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for k in ("color", "size", "selected_color", "selected_size", "variations"):
            validated_data.pop(k, None)
        return super().update(instance, validated_data)

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
