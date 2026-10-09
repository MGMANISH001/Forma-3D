"""Server-side pricing engine.

The storefront shows live prices client-side for immediacy, but every quote
and every order is *recomputed here from the database*, so the client can
never dictate prices.
"""
from dataclasses import dataclass, field
from decimal import Decimal

from catalog.models import PartOption, Product

ENGRAVING_FEE = Decimal('9.90')          # per item, only when text is provided
FLAT_SHIPPING = Decimal('12.90')         # free above threshold
FREE_SHIPPING_THRESHOLD = Decimal('150.00')


@dataclass
class PricedLine:
    product: Product
    quantity: int
    engraving: str
    configuration: dict = field(default_factory=dict)   # part_key -> option payload
    unit_price: Decimal = Decimal('0')
    line_total: Decimal = Decimal('0')


def price_line(product: Product, configuration: dict, engraving: str, quantity: int) -> PricedLine:
    """Compute the authoritative price of one configured line item.

    ``configuration`` maps part_key -> PartOption id. Unknown parts or options
    that do not belong to the product are rejected with ValueError.
    """
    resolved = {}
    unit = product.base_price

    parts_by_key = {part.key: part for part in product.parts.all()}
    for part_key, option_id in (configuration or {}).items():
        part = parts_by_key.get(part_key)
        if part is None:
            raise ValueError(f"Unknown part '{part_key}' for product '{product.slug}'")
        try:
            option = PartOption.objects.select_related('part').get(pk=int(option_id), part=part)
        except (PartOption.DoesNotExist, TypeError, ValueError):
            raise ValueError(f"Invalid option for part '{part_key}' on '{product.slug}'")
        unit += option.price_delta
        resolved[part_key] = {
            'id': option.id,
            'name': option.name,
            'color': option.color,
            'color2': option.color2 or option.color,
            'material': option.material,
            'material_label': option.get_material_display(),
            'price_delta': float(option.price_delta),
        }

    # Any part the client did not choose falls back to its default option,
    # so an order always has a complete configuration.
    for part_key, part in parts_by_key.items():
        if part_key in resolved:
            continue
        option = part.options.filter(is_default=True).first() or part.options.first()
        if option:
            unit += option.price_delta
            resolved[part_key] = {
                'id': option.id,
                'name': option.name,
                'color': option.color,
                'color2': option.color2 or option.color,
                'material': option.material,
                'material_label': option.get_material_display(),
                'price_delta': float(option.price_delta),
            }

    if engraving and engraving.strip():
        unit += ENGRAVING_FEE

    unit = unit.quantize(Decimal('0.01'))
    line_total = (unit * quantity).quantize(Decimal('0.01'))
    return PricedLine(
        product=product,
        quantity=quantity,
        engraving=(engraving or '').strip()[:24],
        configuration=resolved,
        unit_price=unit,
        line_total=line_total,
    )


def shipping_for(subtotal: Decimal) -> Decimal:
    return Decimal('0.00') if subtotal >= FREE_SHIPPING_THRESHOLD else FLAT_SHIPPING
