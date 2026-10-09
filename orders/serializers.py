from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemOutputSerializer(serializers.ModelSerializer):
    unit_price = serializers.FloatField()
    line_total = serializers.FloatField()
    configuration_display = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'product_name', 'product_slug', 'model_type', 'configuration',
            'configuration_display', 'engraving', 'quantity', 'unit_price', 'line_total',
        ]

    def get_configuration_display(self, obj) -> str:
        return obj.configuration_pretty()


class OrderOutputSerializer(serializers.ModelSerializer):
    subtotal = serializers.FloatField()
    shipping = serializers.FloatField()
    total = serializers.FloatField()
    items = OrderItemOutputSerializer(many=True, read_only=True)
    status_label = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format='%b %d, %Y %H:%M')

    class Meta:
        model = Order
        fields = [
            'order_number', 'customer_name', 'email', 'address', 'city', 'postal_code',
            'country', 'subtotal', 'shipping', 'total', 'currency', 'status', 'status_label',
            'created_at', 'items',
        ]

    def get_status_label(self, obj) -> str:
        return Order.Status(obj.status).label


class CartItemInputSerializer(serializers.Serializer):
    """Payload accepted from the storefront cart at checkout."""

    slug = serializers.SlugField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)
    engraving = serializers.CharField(required=False, allow_blank=True, max_length=24)
    configuration = serializers.DictField(
        child=serializers.IntegerField(), required=False, allow_empty=True,
        help_text='Map of part_key -> PartOption id',
    )


class CheckoutInputSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)
    address = serializers.CharField(max_length=240)
    city = serializers.CharField(max_length=120)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=80)
    note = serializers.CharField(required=False, allow_blank=True)
    items = CartItemInputSerializer(many=True, min_length=1)
