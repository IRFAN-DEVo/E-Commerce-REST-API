from rest_framework import serializers

from orders.models import (
    Order,
    OrderItem,
    ShippingAddress,
)


class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    product_image = serializers.SerializerMethodField()

    sub_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem

        fields = [
            "id",
            "product",
            "product_name",
            "product_image",
            "quantity",
            "price",
            "sub_total",
        ]

        read_only_fields = [
            "price",
            "sub_total",
            "product_name",
            "product_image",
        ]

    def get_sub_total(self, obj):
        return obj.price * obj.quantity

    def get_product_image(self, obj):
        request = self.context.get("request")
        if obj.product and obj.product.image:
            url = obj.product.image.url if hasattr(obj.product.image, "url") else str(obj.product.image)
            if request:
                return request.build_absolute_uri(url)
            return url
        return None



class ShippingAddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = ShippingAddress

        fields = [
            "full_name",
            "phone",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
        ]



class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    shipping_address = ShippingAddressSerializer(
        read_only=True
    )

    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()


    class Meta:
        model = Order

        fields = [
            "id",
            "status",
            "total_price",
            "created_at",
            "updated_at",
            "customer_name",
            "customer_email",
            "customer_phone",
            "payment_status",
            "payment_method",
            "items",
            "shipping_address",
        ]

        read_only_fields = [
            "status",
            "total_price",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        if hasattr(obj, "user") and obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "—"

    def get_customer_email(self, obj):
        if hasattr(obj, "user") and obj.user:
            return obj.user.email
        return "—"

    def get_customer_phone(self, obj):
        if hasattr(obj, "user") and obj.user:
            return getattr(obj.user, "phone", "—")
        return "—"

    def get_payment_status(self, obj):
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.payment_status
        return "—"

    def get_payment_method(self, obj):
        if hasattr(obj, "payment") and obj.payment:
            return obj.payment.payment_method
        return "—"



class UpdateOrderStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = Order

        fields = [
            "status",
        ]


    def validate_status(self, value):

        order = self.instance

        if not order:
            return value

        allowed_transitions = {

            "PENDING": [
                "PROCESSING",
                "CANCELLED",
            ],

            "PROCESSING": [
                "SHIPPED",
            ],

            "SHIPPED": [
                "DELIVERED",
            ],

            "DELIVERED": [],

            "CANCELLED": [],
        }


        if value not in allowed_transitions.get(
            order.status,
            []
        ):

            raise serializers.ValidationError(
                f"Cannot change order status from "
                f"'{order.status}' to '{value}'."
            )


        return value



class CheckoutSerializer(serializers.Serializer):
    shipping_address = ShippingAddressSerializer()