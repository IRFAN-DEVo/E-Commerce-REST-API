from rest_framework import serializers
from wishlist.models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Wishlist
        fields = [
            "id",
            "user",
            "product",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        # Expand the product field on read operations if product exists
        if instance.product:
            from api.v1.products.serializers import ProductSerializer
            repr_data["product"] = ProductSerializer(instance.product, context=self.context).data
        else:
            repr_data["product"] = None
        return repr_data
