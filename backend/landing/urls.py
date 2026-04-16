from django.urls import path
from .views import PublicLandingView, AdminLandingView

urlpatterns = [
    path('', PublicLandingView.as_view(), name='landing-public'),
    path('admin/', AdminLandingView.as_view(), name='landing-admin'),
]
