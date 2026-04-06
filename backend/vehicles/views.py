from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from accounts.permissions import IsAdmin
from .models import Vehicle
from .serializers import VehicleListSerializer, VehicleDetailSerializer, VehiclePublicSerializer


class PublicVehicleListView(generics.ListAPIView):
    """Public: list available vehicles, optionally filtered by category."""
    serializer_class = VehiclePublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Vehicle.objects.filter(is_active=True, status='available').select_related('category')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        return qs


class AdminVehicleListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['category', 'status', 'is_active']
    search_fields = ['name', 'plate_number', 'description']

    def get_queryset(self):
        return Vehicle.objects.select_related('category').all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VehicleListSerializer
        return VehicleDetailSerializer


class AdminVehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Vehicle.objects.select_related('category').all()
