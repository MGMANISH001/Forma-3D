"""Seed the catalog with eight fully configurable demo products.

Idempotent: skips when products already exist unless --force is given.
"""
import random

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Material, Part, PartOption, Product


def option(name, color, material, delta=0.0, default=False, color2=''):
    return dict(name=name, color=color, color2=color2, material=material,
                price_delta=delta, is_default=default)


def build_chair():
    product = Product.objects.create(
        name='Aurora Lounge Chair',
        slug='aurora-lounge-chair',
        tagline='Sculpted comfort, tuned by you',
        description=(
            'A mid-century silhouette rebuilt for long evenings. Every surface of the '
            'Aurora is configurable — from the Bouclé seat and the walnut frame to the '
            'anodized steel base. Each chair is assembled to order in 12 working days '
            'and shipped flat-pack free.'
        ),
        category='Living',
        model_type=Product.ModelType.CHAIR,
        base_price=649.00,
        featured=True,
        badge='Bestseller',
        rating=4.9,
        review_count=1284,
    )
    p1 = Part.objects.create(product=product, name='Seat cushion', key='seat',
                             help_text='The main upholstered surface', order=0)
    p2 = Part.objects.create(product=product, name='Backrest', key='back',
                             help_text='Lumbar support panel', order=1)
    p3 = Part.objects.create(product=product, name='Frame', key='frame',
                             help_text='Solid wood structure', order=2)
    p4 = Part.objects.create(product=product, name='Base & legs', key='base',
                             help_text='Four-star swivel base', order=3)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Ivory Bouclé', '#EDE4D3', Material.FABRIC, 0, True)),
        PartOption(part=p1, order=1, **option('Terracotta Weave', '#C75B39', Material.FABRIC, 40)),
        PartOption(part=p1, order=2, **option('Forest Wool', '#4A5D4E', Material.FABRIC, 40)),
        PartOption(part=p1, order=3, **option('Charcoal Twill', '#3B3A38', Material.FABRIC, 25)),
        PartOption(part=p1, order=4, **option('Cognac Leather', '#8B4A2F', Material.LEATHER, 180)),
        PartOption(part=p1, order=5, **option('Ink Leather', '#26241F', Material.LEATHER, 180)),

        PartOption(part=p2, order=0, **option('Match Seat', '#EDE4D3', Material.FABRIC, 0, True)),
        PartOption(part=p2, order=1, **option('Cognac Leather', '#8B4A2F', Material.LEATHER, 150)),
        PartOption(part=p2, order=2, **option('Slate Suede', '#6E7378', Material.FABRIC, 60)),
        PartOption(part=p2, order=3, **option('Sand Linen', '#D8C9A8', Material.FABRIC, 35)),

        PartOption(part=p3, order=0, **option('Natural Oak', '#C89B6A', Material.WOOD, 0, True)),
        PartOption(part=p3, order=1, **option('Smoked Walnut', '#5C4432', Material.WOOD, 70)),
        PartOption(part=p3, order=2, **option('Ebonized Ash', '#2E2A26', Material.WOOD, 70)),
        PartOption(part=p3, order=3, **option('Bleached Maple', '#E4D3B2', Material.WOOD, 45)),

        PartOption(part=p4, order=0, **option('Brushed Steel', '#9DA3A8', Material.METAL, 0, True)),
        PartOption(part=p4, order=1, **option('Matte Black', '#24262A', Material.METAL, 30)),
        PartOption(part=p4, order=2, **option('Champagne Brass', '#C9A86A', Material.METAL, 85)),
    ])
    return product


def build_mug():
    product = Product.objects.create(
        name='Terra Ceramic Mug',
        slug='terra-ceramic-mug',
        tagline='Hand-glazed, fired to order',
        description=(
            'A 350 ml stoneware mug thrown by hand in small batches. Choose the body '
            'glaze, the interior finish and the handle style — every combination is '
            'food-safe, dishwasher-proof and unique thanks to reactive glazing.'
        ),
        category='Tabletop',
        model_type=Product.ModelType.MUG,
        base_price=34.00,
        featured=True,
        badge='New',
        rating=4.8,
        review_count=612,
    )
    p1 = Part.objects.create(product=product, name='Body glaze', key='body',
                             help_text='Exterior stoneware finish', order=0)
    p2 = Part.objects.create(product=product, name='Interior', key='interior',
                             help_text='Inside glaze and rim', order=1)
    p3 = Part.objects.create(product=product, name='Handle', key='handle',
                             help_text='Grip style and color', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Sand Matte', '#D9C7B2', Material.CERAMIC, 0, True)),
        PartOption(part=p1, order=1, **option('Rust Reactive', '#B0562F', Material.CERAMIC, 8)),
        PartOption(part=p1, order=2, **option('Sage Speckle', '#9DAE8E', Material.CERAMIC, 8)),
        PartOption(part=p1, order=3, **option('Midnight Glaze', '#2F3542', Material.CERAMIC, 12)),
        PartOption(part=p1, order=4, **option('Blush Satin', '#E3B7A0', Material.CERAMIC, 6)),

        PartOption(part=p2, order=0, **option('Classic White', '#F4EFE8', Material.CERAMIC, 0, True)),
        PartOption(part=p2, order=1, **option('Cobalt Depth', '#31528C', Material.CERAMIC, 6)),
        PartOption(part=p2, order=2, **option('Molten Amber', '#C98A2D', Material.CERAMIC, 6)),

        PartOption(part=p3, order=0, **option('Match Body', '#D9C7B2', Material.CERAMIC, 0, True)),
        PartOption(part=p3, order=1, **option('Raw Clay', '#B08A6A', Material.CERAMIC, 3)),
        PartOption(part=p3, order=2, **option('Black Stoneware', '#33312E', Material.CERAMIC, 5)),
    ])
    return product


def build_bottle():
    product = Product.objects.create(
        name='Hydra Steel Bottle',
        slug='hydra-steel-bottle',
        tagline='24 h cold, 12 h hot — fully yours',
        description=(
            'A double-walled 750 ml vacuum bottle in food-grade 18/8 steel. Configure '
            'the powder-coat body, the lid finish and the silicone bumper. Laser '
            'engraving available on the body panel.'
        ),
        category='Travel',
        model_type=Product.ModelType.BOTTLE,
        base_price=42.00,
        featured=True,
        badge='',
        rating=4.7,
        review_count=934,
    )
    p1 = Part.objects.create(product=product, name='Body coat', key='body',
                             help_text='Powder-coated steel shell', order=0)
    p2 = Part.objects.create(product=product, name='Lid', key='lid',
                             help_text='Cap and grip loop', order=1)
    p3 = Part.objects.create(product=product, name='Bumper base', key='bumper',
                             help_text='Silicone anti-slip ring', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Arctic White', '#E8E9E4', Material.METAL, 0, True)),
        PartOption(part=p1, order=1, **option('Moss Green', '#5B6B4F', Material.METAL, 4)),
        PartOption(part=p1, order=2, **option('Deep Ocean', '#33506B', Material.METAL, 4)),
        PartOption(part=p1, order=3, **option('Coral Fade', '#E2795B', Material.METAL, 6)),
        PartOption(part=p1, order=4, **option('Raw Steel', '#A7ABB0', Material.METAL, -4)),
        PartOption(part=p1, order=5, **option('Midnight Black', '#22252A', Material.METAL, 4)),

        PartOption(part=p2, order=0, **option('Match Body', '#E8E9E4', Material.PLASTIC, 0, True)),
        PartOption(part=p2, order=1, **option('Bamboo Cap', '#C8A36B', Material.WOOD, 9)),
        PartOption(part=p2, order=2, **option('Steel Loop', '#8E939A', Material.METAL, 6)),

        PartOption(part=p3, order=0, **option('Clear Silicone', '#D8D8D4', Material.RUBBER, 0, True)),
        PartOption(part=p3, order=1, **option('Charcoal Grip', '#4A4A48', Material.RUBBER, 3)),
        PartOption(part=p3, order=2, **option('Poppy Accent', '#D9503F', Material.RUBBER, 3)),
    ])
    return product


def build_lamp():
    product = Product.objects.create(
        name='Orbit Desk Lamp',
        slug='orbit-desk-lamp',
        tagline='Warm-to-cool light, dimmable to a candle',
        description=(
            'A counterweight desk lamp with a stepless dimmer and 2700–5000 K tuning. '
            'Pick the shade finish, arm color and base material. The marble base is '
            'cut from offcuts, so every piece carries its own veining.'
        ),
        category='Lighting',
        model_type=Product.ModelType.LAMP,
        base_price=129.00,
        featured=False,
        badge='Editor’s pick',
        rating=4.9,
        review_count=458,
    )
    p1 = Part.objects.create(product=product, name='Shade', key='shade',
                             help_text='Spun-metal reflector', order=0)
    p2 = Part.objects.create(product=product, name='Arm', key='arm',
                             help_text='Counterbalanced arm', order=1)
    p3 = Part.objects.create(product=product, name='Base', key='base',
                             help_text='Weighted floor plate', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Chalk White', '#EFEDE6', Material.METAL, 0, True)),
        PartOption(part=p1, order=1, **option('Olive Enamel', '#6F7649', Material.METAL, 10)),
        PartOption(part=p1, order=2, **option('Terracotta', '#C26A44', Material.METAL, 10)),
        PartOption(part=p1, order=3, **option('Slate Blue', '#4E5D6E', Material.METAL, 10)),

        PartOption(part=p2, order=0, **option('Graphite', '#3A3C40', Material.METAL, 0, True)),
        PartOption(part=p2, order=1, **option('Brushed Brass', '#C5A567', Material.METAL, 25)),
        PartOption(part=p2, order=2, **option('Chrome', '#B9BEC4', Material.METAL, 15)),

        PartOption(part=p3, order=0, **option('Grey Marble', '#9A9C9E', Material.WOOD, 0, True, color2='#DADADA')),
        PartOption(part=p3, order=1, **option('Black Marble', '#2B2B2D', Material.WOOD, 20, color2='#55565A')),
        PartOption(part=p3, order=2, **option('Cast Concrete', '#8D8D88', Material.PLASTIC, -5)),
    ])
    return product


def build_headphones():
    product = Product.objects.create(
        name='Nova Studio Headphones',
        slug='nova-studio-headphones',
        tagline='Reference sound, styled by you',
        description=(
            'Over-ear studio headphones with 40 mm graphene drivers and 30-hour '
            'battery life. Configure the anodized cup shells, the steel headband '
            'and the memory-foam cushions — every pair is tuned and assembled to order.'
        ),
        category='Tech',
        model_type=Product.ModelType.HEADPHONES,
        base_price=189.00,
        featured=True,
        badge='New',
        rating=4.8,
        review_count=733,
    )
    p1 = Part.objects.create(product=product, name='Ear cups', key='cups',
                             help_text='Anodized aluminum shells', order=0)
    p2 = Part.objects.create(product=product, name='Headband', key='band',
                             help_text='Spring steel arch', order=1)
    p3 = Part.objects.create(product=product, name='Cushions', key='cushions',
                             help_text='Memory-foam ear pads', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Midnight Black', '#2A2C30', Material.METAL, 0, True)),
        PartOption(part=p1, order=1, **option('Silver Cloud', '#C9CDD2', Material.METAL, 15)),
        PartOption(part=p1, order=2, **option('Navy Pulse', '#31456B', Material.METAL, 10)),
        PartOption(part=p1, order=3, **option('Blush Pink', '#D8A5A0', Material.PLASTIC, 10)),
        PartOption(part=p1, order=4, **option('Forest Green', '#3E5747', Material.METAL, 10)),

        PartOption(part=p2, order=0, **option('Graphite Steel', '#3A3C40', Material.METAL, 0, True)),
        PartOption(part=p2, order=1, **option('Brushed Brass', '#C5A567', Material.METAL, 20)),
        PartOption(part=p2, order=2, **option('Matte Black', '#24262A', Material.METAL, 5)),

        PartOption(part=p3, order=0, **option('Cloud Leather', '#D9CFC0', Material.LEATHER, 0, True)),
        PartOption(part=p3, order=1, **option('Ink Leather', '#26241F', Material.LEATHER, 12)),
        PartOption(part=p3, order=2, **option('Suede Sage', '#8E9B7E', Material.FABRIC, 9)),
    ])
    return product


def build_clock():
    product = Product.objects.create(
        name='Halo Wall Clock',
        slug='halo-wall-clock',
        tagline='Silent sweep, sculptural presence',
        description=(
            'A 30 cm wall or desk clock with a silent sweep movement and solid '
            'hardwood bezel. Pick the dial finish, the bezel wood and the hand '
            'metal — the markers are milled from the same sheet as the hands.'
        ),
        category='Decor',
        model_type=Product.ModelType.CLOCK,
        base_price=79.00,
        featured=False,
        badge='',
        rating=4.7,
        review_count=389,
    )
    p1 = Part.objects.create(product=product, name='Dial', key='face',
                             help_text='Matte aluminum face', order=0)
    p2 = Part.objects.create(product=product, name='Bezel & stand', key='ring',
                             help_text='Solid hardwood ring', order=1)
    p3 = Part.objects.create(product=product, name='Hands', key='hands',
                             help_text='Diamond-cut pointers', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Chalk White', '#F2EEE6', Material.PLASTIC, 0, True)),
        PartOption(part=p1, order=1, **option('Charcoal', '#33363B', Material.PLASTIC, 6)),
        PartOption(part=p1, order=2, **option('Terracotta', '#C26A44', Material.CERAMIC, 8)),
        PartOption(part=p1, order=3, **option('Sage', '#9DAE8E', Material.CERAMIC, 8)),

        PartOption(part=p2, order=0, **option('Natural Oak', '#C89B6A', Material.WOOD, 0, True)),
        PartOption(part=p2, order=1, **option('Smoked Walnut', '#5C4432', Material.WOOD, 12)),
        PartOption(part=p2, order=2, **option('Brushed Brass', '#C9A86A', Material.METAL, 18)),
        PartOption(part=p2, order=3, **option('Matte Black', '#24262A', Material.METAL, 10)),

        PartOption(part=p3, order=0, **option('Graphite', '#3A3C40', Material.METAL, 0, True)),
        PartOption(part=p3, order=1, **option('Brass', '#C5A567', Material.METAL, 9)),
        PartOption(part=p3, order=2, **option('Rose Copper', '#B76B55', Material.METAL, 9)),
    ])
    return product


def build_vase():
    product = Product.objects.create(
        name='Pebble Ceramic Vase',
        slug='pebble-ceramic-vase',
        tagline='Thrown by hand, glazed your way',
        description=(
            'A river-pebble silhouette thrown on the wheel in stoneware clay. '
            'Choose the reactive body glaze, the hand-pulled lip and the raw '
            'foot — each vase is fired twice and carries its own speckling.'
        ),
        category='Tabletop',
        model_type=Product.ModelType.VASE,
        base_price=54.00,
        featured=False,
        badge='Handmade',
        rating=4.9,
        review_count=264,
    )
    p1 = Part.objects.create(product=product, name='Body glaze', key='body',
                             help_text='Reactive stoneware finish', order=0)
    p2 = Part.objects.create(product=product, name='Lip', key='lip',
                             help_text='Hand-pulled rim', order=1)
    p3 = Part.objects.create(product=product, name='Foot', key='foot',
                             help_text='Unglazed base ring', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Sand Matte', '#D9C7B2', Material.CERAMIC, 0, True)),
        PartOption(part=p1, order=1, **option('Rust Reactive', '#B0562F', Material.CERAMIC, 9)),
        PartOption(part=p1, order=2, **option('Speckled Cream', '#EFE3CE', Material.CERAMIC, 6)),
        PartOption(part=p1, order=3, **option('Ocean Glaze', '#4E6E7E', Material.CERAMIC, 9)),
        PartOption(part=p1, order=4, **option('Obsidian', '#2F2D2B', Material.CERAMIC, 12)),

        PartOption(part=p2, order=0, **option('Match Body', '#D9C7B2', Material.CERAMIC, 0, True)),
        PartOption(part=p2, order=1, **option('Raw Clay', '#B08A6A', Material.CERAMIC, 5)),
        PartOption(part=p2, order=2, **option('Gold Rim', '#C9A86A', Material.METAL, 15)),

        PartOption(part=p3, order=0, **option('Raw Clay', '#B08A6A', Material.CERAMIC, 0, True)),
        PartOption(part=p3, order=1, **option('Black Stoneware', '#33312E', Material.CERAMIC, 4)),
        PartOption(part=p3, order=2, **option('White Stoneware', '#F4EFE8', Material.CERAMIC, 4)),
    ])
    return product


def build_candle():
    product = Product.objects.create(
        name='Ember Soy Candle',
        slug='ember-soy-candle',
        tagline='45 hours of warm, clean light',
        description=(
            'Hand-poured soy wax in a mouth-blown glass vessel with a cotton '
            'wick and a spun-metal snuffer lid. Choose the vessel tint, the '
            'wax hue and the lid finish — scents rotate with the season.'
        ),
        category='Wellness',
        model_type=Product.ModelType.CANDLE,
        base_price=29.00,
        featured=True,
        badge='Bestseller',
        rating=4.8,
        review_count=521,
    )
    p1 = Part.objects.create(product=product, name='Vessel', key='jar',
                             help_text='Mouth-blown glass', order=0)
    p2 = Part.objects.create(product=product, name='Wax', key='wax',
                             help_text='Hand-poured soy fill', order=1)
    p3 = Part.objects.create(product=product, name='Snuffer lid', key='lid',
                             help_text='Spun-metal cap', order=2)

    PartOption.objects.bulk_create([
        PartOption(part=p1, order=0, **option('Clear Glass', '#EAF2F0', Material.GLASS, 0, True)),
        PartOption(part=p1, order=1, **option('Amber Glass', '#C98A2D', Material.GLASS, 6)),
        PartOption(part=p1, order=2, **option('Smoke Glass', '#7A7D80', Material.GLASS, 6)),
        PartOption(part=p1, order=3, **option('Sea Glass', '#9FB8AD', Material.GLASS, 6)),

        PartOption(part=p2, order=0, **option('Ivory Soy', '#F2EAD9', Material.CERAMIC, 0, True)),
        PartOption(part=p2, order=1, **option('Amber Honey', '#D9A441', Material.CERAMIC, 4)),
        PartOption(part=p2, order=2, **option('Blush Peony', '#E3B7A0', Material.CERAMIC, 4)),
        PartOption(part=p2, order=3, **option('Eucalyptus', '#8FA98F', Material.CERAMIC, 4)),

        PartOption(part=p3, order=0, **option('Brushed Brass', '#C9A86A', Material.METAL, 0, True)),
        PartOption(part=p3, order=1, **option('Matte Black', '#24262A', Material.METAL, 4)),
        PartOption(part=p3, order=2, **option('Bamboo', '#C8A36B', Material.WOOD, 4)),
    ])
    return product


class Command(BaseCommand):
    help = 'Seed demo catalog data for the 3D configurator storefront'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Wipe and reseed the catalog')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['force']:
            PartOption.objects.all().delete()
            Part.objects.all().delete()
            Product.objects.all().delete()

        if Product.objects.exists():
            self.stdout.write(self.style.WARNING(
                f'Catalog already seeded ({Product.objects.count()} products). Use --force to reseed.'))
            return

        for builder in (build_chair, build_mug, build_bottle, build_lamp,
                        build_headphones, build_clock, build_vase, build_candle):
            product = builder()
            self.stdout.write(self.style.SUCCESS(
                f"Seeded {product.name} ({product.parts.count()} parts, "
                f"{sum(p.options.count() for p in product.parts.all())} options)"))

        self.stdout.write(self.style.SUCCESS('Done.'))
