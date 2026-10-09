from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from catalog.views import ProductViewSet
from config.frontend import serve_frontend
from orders.views import OrderCreateView, OrderDetailView, QuoteView

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')


def health(request):
    return JsonResponse({'status': 'ok', 'service': 'django-rest', 'version': '1.0.0'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/quote/', QuoteView.as_view(), name='quote'),
    path('api/orders/', OrderCreateView.as_view(), name='order-create'),
    path('api/orders/<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),
    path('api/health/', health, name='health'),
    # Storefront (vanilla HTML/CSS/JS) — everything not under /api or /admin.
    re_path(r'^(?!api/|admin/|static/)(?P<path>.*)$', serve_frontend, name='frontend'),
]
