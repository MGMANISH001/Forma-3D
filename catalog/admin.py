from django.contrib import admin

from .models import Part, PartOption, Product


class PartOptionInline(admin.TabularInline):
    model = PartOption
    extra = 0
    fields = ['name', 'color', 'color2', 'material', 'price_delta', 'is_default', 'order']


class PartInline(admin.TabularInline):
    model = Part
    extra = 0
    fields = ['name', 'key', 'help_text', 'order']
    show_change_link = True


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'category', 'model_type', 'base_price', 'featured', 'rating']
    list_filter = ['category', 'model_type', 'featured']
    search_fields = ['name', 'slug', 'tagline']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PartInline]


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ['name', 'product', 'key', 'order']
    list_filter = ['product']
    inlines = [PartOptionInline]


@admin.register(PartOption)
class PartOptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'part', 'material', 'price_delta', 'is_default']
    list_filter = ['material']
