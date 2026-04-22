from django.urls import path
from . import views

urlpatterns = [
    path('', views.PublicServiceListView.as_view(), name='public_services'),
    path('suggest/', views.SuggestServiceView.as_view(), name='suggest_service'),
    path('admin/', views.AdminServiceListCreateView.as_view(), name='admin_service_list'),
    path('admin/<int:pk>/', views.AdminServiceDetailView.as_view(), name='admin_service_detail'),
]
