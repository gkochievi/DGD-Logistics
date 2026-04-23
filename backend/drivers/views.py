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
        qs = Driver.objects.prefetch_related('vehicles__categories').all()
        # Per-field contains filters so the admin filter bar can target
        # phone / license number / license categories independently.
        phone_q = self.request.query_params.get('phone_q')
        if phone_q:
            qs = qs.filter(phone__icontains=phone_q)
        license_number_q = self.request.query_params.get('license_number_q')
        if license_number_q:
            qs = qs.filter(license_number__icontains=license_number_q)
        license_cats_q = self.request.query_params.get('license_categories_q')
        if license_cats_q:
            qs = qs.filter(license_categories__icontains=license_cats_q)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DriverListSerializer
        return DriverDetailSerializer


class AdminDriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DriverDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Driver.objects.prefetch_related('vehicles__categories').all()
