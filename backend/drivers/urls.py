from django.urls import path
from . import views

urlpatterns = [
    path('admin/', views.AdminDriverListCreateView.as_view(), name='admin_driver_list'),
    path('admin/<int:pk>/', views.AdminDriverDetailView.as_view(), name='admin_driver_detail'),
]
