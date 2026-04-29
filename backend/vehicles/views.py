from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import Vehicle, VehicleImage
from .serializers import (
    VehicleListSerializer, VehicleDetailSerializer, VehiclePublicSerializer,
    VehicleImageSerializer,
)


class PublicVehicleListView(generics.ListAPIView):
    """Public: list available vehicles, optionally filtered by category."""
    serializer_class = VehiclePublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        # Show every vehicle the admin hasn't explicitly disabled (is_active=False).
        # Operational statuses like 'in_use' or 'maintenance' should NOT hide a
        # vehicle from the public fleet listing — admins control visibility via
        # the disable toggle, not the day-to-day status field.
        qs = Vehicle.objects.filter(is_active=True).prefetch_related('categories', 'images')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(categories__id=category).distinct()
        return qs


class AdminVehicleListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['categories', 'status', 'is_active']
    search_fields = ['name', 'plate_number', 'description']

    def get_queryset(self):
        qs = Vehicle.objects.prefetch_related('categories', 'images').all()
        # Per-field contains filters for the admin filter bar. Keep these
        # separate from `search` so admins can stack them (e.g. plate=AB +
        # capacity=5 tons) without interference.
        plate_q = self.request.query_params.get('plate_number_q')
        if plate_q:
            qs = qs.filter(plate_number__icontains=plate_q)
        capacity_q = self.request.query_params.get('capacity_q')
        if capacity_q:
            qs = qs.filter(capacity__icontains=capacity_q)
        license_q = self.request.query_params.get('license_categories_q')
        if license_q:
            qs = qs.filter(license_categories__icontains=license_q)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VehicleListSerializer
        return VehicleDetailSerializer


class AdminVehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Vehicle.objects.prefetch_related('categories', 'images').all()


class AdminVehicleImagesView(APIView):
    """Upload (POST) or delete (DELETE ?image_id=) vehicle photos. Max 5 per vehicle."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            vehicle = Vehicle.objects.get(pk=pk)
        except Vehicle.DoesNotExist:
            return Response({'detail': 'Vehicle not found.'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('images')
        if not files:
            return Response({'detail': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = vehicle.images.count()
        remaining = VehicleImage.MAX_IMAGES - existing
        if remaining <= 0:
            return Response(
                {'detail': f'Maximum {VehicleImage.MAX_IMAGES} images per vehicle.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(files) > remaining:
            return Response(
                {'detail': f'Only {remaining} more image(s) allowed ({VehicleImage.MAX_IMAGES} max).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If the vehicle currently has no primary photo, the first newly-uploaded
        # image becomes the primary so the landing page always has one to show.
        needs_primary = not vehicle.images.filter(is_primary=True).exists()
        created = []
        for idx, img in enumerate(files):
            obj = VehicleImage.objects.create(
                vehicle=vehicle,
                image=img,
                order=existing + idx,
                is_primary=(needs_primary and idx == 0),
            )
            created.append(VehicleImageSerializer(obj, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)


class AdminVehicleImageDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def delete(self, request, pk, image_id):
        try:
            img = VehicleImage.objects.get(pk=image_id, vehicle_id=pk)
        except VehicleImage.DoesNotExist:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        was_primary = img.is_primary
        img.delete()
        # If we just deleted the primary photo, promote the new first image
        # so the vehicle keeps a visible main photo on the landing page.
        if was_primary:
            new_primary = VehicleImage.objects.filter(vehicle_id=pk).first()
            if new_primary is not None:
                VehicleImage.objects.filter(pk=new_primary.pk).update(is_primary=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVehicleImageSetPrimaryView(APIView):
    """Mark one of a vehicle's gallery images as the primary (landing-page) photo.
    Atomically clears any other primary on the same vehicle."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk, image_id):
        if not VehicleImage.objects.filter(pk=image_id, vehicle_id=pk).exists():
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        with transaction.atomic():
            VehicleImage.objects.filter(vehicle_id=pk).exclude(pk=image_id).update(is_primary=False)
            VehicleImage.objects.filter(pk=image_id, vehicle_id=pk).update(is_primary=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
