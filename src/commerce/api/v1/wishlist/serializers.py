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
        repr = super().to_representation(instance)
        # Expand the product field on read operations
        from api.v1.products.serializers import ProductSerializer
        repr["product"] = ProductSerializer(instance.product, context=self.context).data
        return repr