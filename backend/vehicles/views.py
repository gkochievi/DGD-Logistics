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
        qs = Vehicle.objects.filter(is_active=True, status='available').prefetch_related('categories', 'images')
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
        return Vehicle.objects.prefetch_related('categories', 'images').all()

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

        created = []
        for idx, img in enumerate(files):
            obj = VehicleImage.objects.create(vehicle=vehicle, image=img, order=existing + idx)
            created.append(VehicleImageSerializer(obj, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)


class AdminVehicleImageDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def delete(self, request, pk, image_id):
        try:
            img = VehicleImage.objects.get(pk=image_id, vehicle_id=pk)
        except VehicleImage.DoesNotExist:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
