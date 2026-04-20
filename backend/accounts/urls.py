from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('profile/stats/', views.ProfileStatsView.as_view(), name='profile_stats'),

    # Admin user management
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_user_list'),
    path('admin/users/create/', views.AdminUserCreateView.as_view(), name='admin_user_create'),
    path('admin/users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/users/<int:pk>/reset-password/', views.AdminResetUserPasswordView.as_view(), name='admin_user_reset_password'),
    path('admin/dashboard/', views.AdminDashboardStatsView.as_view(), name='admin_dashboard'),
    path('admin/analytics/', views.AdminAnalyticsView.as_view(), name='admin_analytics'),
]
