from django.urls import path
from . import views

urlpatterns = [
    path('', views.PublicVehicleListView.as_view(), name='public_vehicles'),
    path('admin/', views.AdminVehicleListCreateView.as_view(), name='admin_vehicle_list'),
    path('admin/<int:pk>/', views.AdminVehicleDetailView.as_view(), name='admin_vehicle_detail'),
    path('admin/<int:pk>/images/', views.AdminVehicleImagesView.as_view(), name='admin_vehicle_images'),
    path('admin/<int:pk>/images/<int:image_id>/', views.AdminVehicleImageDeleteView.as_view(), name='admin_vehicle_image_delete'),
    path('admin/<int:pk>/images/<int:image_id>/primary/', views.AdminVehicleImageSetPrimaryView.as_view(), name='admin_vehicle_image_set_primary'),
]
