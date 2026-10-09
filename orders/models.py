import json

from django.db import models

from catalog.models import Material


class Order(models.Model):
    """A placed order containing one or more configured products."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending payment'
        CONFIRMED = 'confirmed', 'Confirmed'
        IN_PRODUCTION = 'in_production', 'In production'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    customer_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=240)
    city = models.CharField(max_length=120)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=80)
    note = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.order_number} · {self.customer_name}'

    def save(self, *args, **kwargs):
        if not self.order_number:
            import uuid
            self.order_number = f'3DC-{uuid.uuid4().hex[:8].upper()}'
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """One configured product inside an order. The chosen configuration is
    stored as JSON: {part_key: {option fields}}."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=120)
    product_slug = models.SlugField(max_length=140)
    model_type = models.CharField(max_length=20)
    configuration = models.JSONField(default=dict, blank=True)
    engraving = models.CharField(max_length=24, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self) -> str:
        return f'{self.quantity}x {self.product_name}'

    def configuration_pretty(self):
        try:
            data = self.configuration if isinstance(self.configuration, dict) else json.loads(self.configuration)
        except (TypeError, json.JSONDecodeError):
            return '—'
        return ' · '.join(f"{k.title()}: {v.get('name')}" for k, v in data.items()) or 'Standard'


# Re-export for pricing helpers
MATERIALS = Material
