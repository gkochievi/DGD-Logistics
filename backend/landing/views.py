from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import LandingPageSettings
from .serializers import LandingPageSerializer


class PublicLandingView(APIView):
    """Public endpoint: returns landing page content."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        instance = LandingPageSettings.get_instance()
        serializer = LandingPageSerializer(instance, context={'request': request})
        return Response(serializer.data)


class AdminLandingView(APIView):
    """Admin endpoint: get and update landing page settings."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        instance = LandingPageSettings.get_instance()
        serializer = LandingPageSerializer(instance, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        instance = LandingPageSettings.get_instance()
        serializer = LandingPageSerializer(
            instance, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)
