from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import TransportCategory
from .serializers import TransportCategorySerializer, TransportCategoryPublicSerializer
from .suggestion import suggest_category


class PublicCategoryListView(generics.ListAPIView):
    """Public endpoint: returns only active categories."""
    serializer_class = TransportCategoryPublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return TransportCategory.objects.filter(is_active=True)


class SuggestCategoryView(APIView):
    """Given a text description, return a suggested category."""
    def post(self, request):
        description = request.data.get('description', '')
        category = suggest_category(description)
        if category:
            return Response(TransportCategoryPublicSerializer(category).data)
        return Response({'detail': 'No suggestion found.'}, status=status.HTTP_200_OK)


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = TransportCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = TransportCategory.objects.all()
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransportCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = TransportCategory.objects.all()
