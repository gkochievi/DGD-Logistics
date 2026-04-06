from django.urls import path
from . import views

urlpatterns = [
    path('', views.PublicCategoryListView.as_view(), name='public_categories'),
    path('suggest/', views.SuggestCategoryView.as_view(), name='suggest_category'),
    path('admin/', views.AdminCategoryListCreateView.as_view(), name='admin_category_list'),
    path('admin/<int:pk>/', views.AdminCategoryDetailView.as_view(), name='admin_category_detail'),
]
