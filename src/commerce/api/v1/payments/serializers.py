from rest_framework import serializers

from payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    transaction_id = serializers.CharField(read_only=True)
    paid_at = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "payment_method",
            "payment_status",
            "transaction_id",
            "amount",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order",
            "payment_status",
            "transaction_id",
            "amount",
            "paid_at",
            "created_at",
            "updated_at",
        ]

    def validate_payment_method(self, value):
        valid_methods = [
            choice[0] for choice in Payment.PAYMENT_METHOD_CHOICES
        ]

        if value not in valid_methods:
            raise serializers.ValidationError(
                "Invalid payment method."
            )

        return value


class UpdatePaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(
        choices=Payment.PAYMENT_STATUS_CHOICES,
    )

    transaction_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    def validate(self, attrs):
        payment_status = attrs.get("payment_status")
        transaction_id = attrs.get("transaction_id", "")

        payment = self.context.get("payment")

        if (
            payment
            and payment.payment_method in ("RAZORPAY", "STRIPE")
            and payment_status == "SUCCESS"
            and not transaction_id
        ):
            raise serializers.ValidationError(
                {
                    "transaction_id": (
                        "Transaction ID is required for successful online payments."
                    )
                }
            )

        return attrs


class CreatePaymentRequestSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=Payment.PAYMENT_METHOD_CHOICES,
        default="COD",
    )


class RazorpayPaymentVerifySerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=True)
    razorpay_order_id = serializers.CharField(required=True, max_length=255)
    razorpay_payment_id = serializers.CharField(required=True, max_length=255)
    razorpay_signature = serializers.CharField(required=True, max_length=512)


class PaymentConfigSerializer(serializers.Serializer):
    razorpay_enabled = serializers.BooleanField()
    razorpay_key_id = serializers.CharField(allow_blank=True)
    cod_enabled = serializers.BooleanField()
    stripe_enabled = serializers.BooleanField()