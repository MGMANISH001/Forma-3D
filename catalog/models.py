from django.db import models


class Material(models.TextChoices):
    FABRIC = 'fabric', 'Fabric'
    LEATHER = 'leather', 'Leather'
    PLASTIC = 'plastic', 'Plastic'
    METAL = 'metal', 'Metal'
    WOOD = 'wood', 'Wood'
    CERAMIC = 'ceramic', 'Ceramic'
    GLASS = 'glass', 'Glass'
    RUBBER = 'rubber', 'Rubber'


class Product(models.Model):
    """A configurable product. ``model_type`` selects the procedural 3D model
    rendered client-side by the WebGL configurator."""

    class ModelType(models.TextChoices):
        CHAIR = 'chair', 'Lounge Chair'
        MUG = 'mug', 'Ceramic Mug'
        BOTTLE = 'bottle', 'Water Bottle'
        LAMP = 'lamp', 'Desk Lamp'
        HEADPHONES = 'headphones', 'Studio Headphones'
        CLOCK = 'clock', 'Wall Clock'
        VASE = 'vase', 'Ceramic Vase'
        CANDLE = 'candle', 'Scented Candle'

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    tagline = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=60, default='Signature')
    model_type = models.CharField(max_length=20, choices=ModelType.choices)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    featured = models.BooleanField(default=False)
    badge = models.CharField(max_length=40, blank=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=4.8)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-featured', 'name']

    def __str__(self) -> str:
        return self.name


class Part(models.Model):
    """A configurable component of a product (e.g. 'Seat', 'Frame')."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='parts')
    name = models.CharField(max_length=80)
    key = models.CharField(max_length=40, help_text="Stable key used by the 3D renderer, e.g. 'seat'")
    help_text = models.CharField(max_length=160, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = [('product', 'key')]

    def __str__(self) -> str:
        return f'{self.product.name} · {self.name}'


class PartOption(models.Model):
    """A selectable finish for a part: color + material + price impact."""

    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name='options')
    name = models.CharField(max_length=80)
    color = models.CharField(max_length=9, help_text='Primary hex color, e.g. #C75B39')
    color2 = models.CharField(max_length=9, blank=True, help_text='Optional secondary hex for two-tone finishes')
    material = models.CharField(max_length=20, choices=Material.choices, default=Material.PLASTIC)
    price_delta = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_default = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self) -> str:
        return f'{self.part.name}: {self.name}'
