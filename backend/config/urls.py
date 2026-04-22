from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/drivers/', include('drivers.urls')),
    path('api/landing/', include('landing.urls')),
    path('api/site-settings/', include('site_settings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
