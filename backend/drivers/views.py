from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from accounts.permissions import IsAdmin
from .models import Driver
from .serializers import DriverListSerializer, DriverDetailSerializer


class AdminDriverListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['status', 'is_active', 'vehicles']
    search_fields = ['first_name', 'last_name', 'phone', 'email', 'license_number']

    def get_queryset(self):
        return Driver.objects.prefetch_related('vehicles__categories').all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DriverListSerializer
        return DriverDetailSerializer


class AdminDriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DriverDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Driver.objects.prefetch_related('vehicles__categories').all()
