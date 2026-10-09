from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'product_slug', 'model_type', 'configuration', 'engraving', 'quantity', 'unit_price', 'line_total']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer_name', 'email', 'total', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order_number', 'customer_name', 'email']
    readonly_fields = ['order_number', 'subtotal', 'shipping', 'total', 'created_at']
    inlines = [OrderItemInline]
