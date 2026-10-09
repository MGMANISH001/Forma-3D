from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from orders.models import Order, OrderItem
from orders.pricing import price_line, shipping_for
from orders.serializers import CheckoutInputSerializer, OrderOutputSerializer


class QuoteView(APIView):
    """POST /api/quote/ — server-side price validation for one or more lines.

    Body: {"items": [{"slug", "quantity", "engraving", "configuration": {part: optionId}}]}
    Returns authoritative unit/line prices plus per-part breakdown.
    """

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        raw_items = payload.get('items')
        if not isinstance(raw_items, list) or not raw_items:
            return Response(
                {'error': 'Provide at least one item under "items".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        priced = []
        try:
            for raw in raw_items[:40]:
                slug = raw.get('slug')
                product = get_object_or_404(Product, slug=slug)
                line = price_line(
                    product=product,
                    configuration=raw.get('configuration') or {},
                    engraving=str(raw.get('engraving') or ''),
                    quantity=max(1, min(20, int(raw.get('quantity') or 1))),
                )
                priced.append(line)
        except (ValueError, TypeError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = sum((line.line_total for line in priced), Decimal('0'))
        shipping = shipping_for(subtotal)
        return Response({
            'items': [
                {
                    'slug': line.product.slug,
                    'name': line.product.name,
                    'model_type': line.product.model_type,
                    'configuration': line.configuration,
                    'engraving': line.engraving,
                    'quantity': line.quantity,
                    'unit_price': float(line.unit_price),
                    'line_total': float(line.line_total),
                }
                for line in priced
            ],
            'subtotal': float(subtotal),
            'shipping': float(shipping),
            'total': float(subtotal + shipping),
            'currency': priced[0].product.currency if priced else 'USD',
        })


class OrderCreateView(APIView):
    """POST /api/orders/ — checkout. Recomputes every price, persists the order."""

    def post(self, request):
        input_serializer = CheckoutInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = input_serializer.validated_data

        priced_lines = []
        try:
            for item in data['items']:
                product = get_object_or_404(Product, slug=item['slug'])
                priced_lines.append(price_line(
                    product=product,
                    configuration=item.get('configuration') or {},
                    engraving=item.get('engraving') or '',
                    quantity=item['quantity'],
                ))
        except (ValueError, TypeError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = sum((line.line_total for line in priced_lines), Decimal('0'))
        shipping = shipping_for(subtotal)

        with transaction.atomic():
            order = Order.objects.create(
                customer_name=data['customer_name'],
                email=data['email'],
                phone=data.get('phone', ''),
                address=data['address'],
                city=data['city'],
                postal_code=data['postal_code'],
                country=data['country'],
                note=data.get('note', ''),
                subtotal=subtotal,
                shipping=shipping,
                total=subtotal + shipping,
            )
            for line in priced_lines:
                OrderItem.objects.create(
                    order=order,
                    product_name=line.product.name,
                    product_slug=line.product.slug,
                    model_type=line.product.model_type,
                    configuration=line.configuration,
                    engraving=line.engraving,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    line_total=line.line_total,
                )

        output = OrderOutputSerializer(
            Order.objects.prefetch_related('items').get(pk=order.pk)
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """GET /api/orders/<order_number>/ — order tracking."""

    def get(self, request, order_number):
        order = get_object_or_404(
            Order.objects.prefetch_related('items'), order_number=order_number
        )
        return Response(OrderOutputSerializer(order).data)
