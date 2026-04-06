from django.urls import path
from . import views

urlpatterns = [
    path('', views.PublicVehicleListView.as_view(), name='public_vehicles'),
    path('admin/', views.AdminVehicleListCreateView.as_view(), name='admin_vehicle_list'),
    path('admin/<int:pk>/', views.AdminVehicleDetailView.as_view(), name='admin_vehicle_detail'),
]
