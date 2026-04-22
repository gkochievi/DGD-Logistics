from django.urls import path

from .views import (
    PublicSiteSettingsView, AdminSiteSettingsView,
    AdminRestrictedTimeWindowListCreateView,
    AdminRestrictedTimeWindowDetailView,
)

urlpatterns = [
    path('', PublicSiteSettingsView.as_view(), name='site-settings-public'),
    path('admin/', AdminSiteSettingsView.as_view(), name='site-settings-admin'),
    path(
        'admin/time-windows/',
        AdminRestrictedTimeWindowListCreateView.as_view(),
        name='site-settings-windows-list',
    ),
    path(
        'admin/time-windows/<int:pk>/',
        AdminRestrictedTimeWindowDetailView.as_view(),
        name='site-settings-windows-detail',
    ),
]
