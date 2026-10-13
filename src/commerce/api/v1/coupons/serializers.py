from rest_framework import serializers
from coupons.models import Coupon, CouponUsage


class CouponSerializer(serializers.ModelSerializer):
    used_count = serializers.ReadOnlyField()

    class Meta:
        model = Coupon
        fields = [
            "id",
            "name",
            "code",
            "description",
            "discount_type",
            "discount_value",
            "minimum_order_amount",
            "maximum_discount",
            "usage_limit",
            "used_count",
            "valid_from",
            "valid_to",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "used_count",
            "created_at",
            "updated_at",
        ]


#Apply Coupon Serializer
class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)

    def validate_code(self, value):
        return value.strip().upper()
    

#Coupon Usage Serializer
class CouponUsageSerializer(serializers.ModelSerializer):
    coupon = CouponSerializer(read_only=True)

    class Meta:
        model = CouponUsage
        fields = [
            "id",
            "coupon",
            "order",
            "order_amount",
            "discount_amount",
            "applied_at",
        ]

        read_only_fields = fields