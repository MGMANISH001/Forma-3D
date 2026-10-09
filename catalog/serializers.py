from rest_framework import serializers

from .models import Material, Part, PartOption, Product


class PartOptionSerializer(serializers.ModelSerializer):
    price_delta = serializers.FloatField()
    material_label = serializers.SerializerMethodField()

    class Meta:
        model = PartOption
        fields = ['id', 'name', 'color', 'color2', 'material', 'material_label', 'price_delta', 'is_default']

    def get_material_label(self, obj) -> str:
        return Material(obj.material).label


class PartSerializer(serializers.ModelSerializer):
    options = PartOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Part
        fields = ['id', 'name', 'key', 'help_text', 'options']


class ProductListSerializer(serializers.ModelSerializer):
    base_price = serializers.FloatField()
    rating = serializers.FloatField()
    swatches = serializers.SerializerMethodField()
    parts = PartSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'tagline', 'category', 'model_type', 'base_price',
            'currency', 'featured', 'badge', 'rating', 'review_count', 'swatches', 'parts',
        ]

    def get_swatches(self, obj):
        """First few default option colors, for cards on the storefront grid."""
        colors = []
        for part in obj.parts.all():
            option = part.options.filter(is_default=True).first() or part.options.first()
            if option:
                colors.append({'part': part.key, 'color': option.color})
        return colors


class ProductDetailSerializer(serializers.ModelSerializer):
    base_price = serializers.FloatField()
    rating = serializers.FloatField()
    parts = PartSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'tagline', 'description', 'category', 'model_type',
            'base_price', 'currency', 'badge', 'rating', 'review_count', 'parts',
        ]
