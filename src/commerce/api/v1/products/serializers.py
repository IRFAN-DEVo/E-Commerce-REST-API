from rest_framework import serializers
from products.models import Product, Category, Brand, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "image", "product_count"]


class BrandSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "image", "product_count"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "is_primary", "created_at"]


class ProductSerializer(serializers.ModelSerializer):

    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)

    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True
    )

    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        source="brand",
        write_only=True
    )

    images = ProductImageSerializer(many=True, read_only=True)
    sku = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "price",
            "discount_price",
            "stock",
            "stock_status",
            "image",
            "images",
            "is_available",
            "category",
            "brand",
            "category_name",
            "brand_name",
            "category_id",
            "brand_id",
            "created_at",
            "updated_at",
        ]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate(self, attrs):
        price = attrs.get("price") or (self.instance.price if self.instance else None)
        discount_price = attrs.get("discount_price") if "discount_price" in attrs else (self.instance.discount_price if self.instance else None)

        if discount_price is not None:
            if discount_price <= 0:
                raise serializers.ValidationError({"discount_price": "Discount price must be greater than zero."})
            if price is not None and discount_price >= price:
                raise serializers.ValidationError({"discount_price": "Discount price must be less than the regular price."})

        return attrs


