from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import Service
from .serializers import ServiceSerializer, ServicePublicSerializer
from .suggestion import suggest_service


class PublicServiceListView(generics.ListAPIView):
    """Public endpoint: returns only active services."""
    serializer_class = ServicePublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Service.objects.filter(is_active=True).prefetch_related('car_categories')


class SuggestServiceView(APIView):
    """Given a free-text description, return a suggested service."""
    def post(self, request):
        description = request.data.get('description', '')
        service = suggest_service(description)
        if service:
            return Response(
                ServicePublicSerializer(service, context={'request': request}).data
            )
        return Response({'detail': 'No suggestion found.'}, status=status.HTTP_200_OK)


class AdminServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Service.objects.all().prefetch_related('car_categories')
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']


class AdminServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Service.objects.all().prefetch_related('car_categories')
