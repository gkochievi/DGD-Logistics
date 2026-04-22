from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import SiteSettings, RestrictedTimeWindow
from .serializers import SiteSettingsSerializer, RestrictedTimeWindowSerializer


def _settings_payload(request):
    instance = SiteSettings.get_instance()
    # Inject the queryset so the nested serializer can render windows
    # alongside the singleton settings (avoids a second round-trip).
    instance._restricted_time_windows = RestrictedTimeWindow.objects.all()
    return SiteSettingsSerializer(instance, context={'request': request}).data


class PublicSiteSettingsView(APIView):
    """Public endpoint — exposes branding + active time restrictions to the SPA."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        instance = SiteSettings.get_instance()
        instance._restricted_time_windows = RestrictedTimeWindow.objects.filter(is_active=True)
        return Response(SiteSettingsSerializer(instance, context={'request': request}).data)


class AdminSiteSettingsView(APIView):
    """Admin endpoint — read & update branding/global settings (singleton)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response(_settings_payload(request))

    def put(self, request):
        instance = SiteSettings.get_instance()
        serializer = SiteSettingsSerializer(
            instance, data=request.data, partial=True, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(_settings_payload(request))

    def patch(self, request):
        return self.put(request)


class AdminRestrictedTimeWindowListCreateView(generics.ListCreateAPIView):
    serializer_class = RestrictedTimeWindowSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = RestrictedTimeWindow.objects.all()
    pagination_class = None


class AdminRestrictedTimeWindowDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RestrictedTimeWindowSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = RestrictedTimeWindow.objects.all()
