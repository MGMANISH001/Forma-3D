from rest_framework import viewsets

from .models import Product
from .serializers import ProductDetailSerializer, ProductListSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Catalog endpoints. Returns the storefront representation of every
    configurable product, including parts and finishes."""

    lookup_field = 'slug'
    permission_classes = []

    def get_queryset(self):
        queryset = Product.objects.prefetch_related('parts__options')
        if self.action == 'list':
            queryset = queryset.prefetch_related('parts__options')
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer
