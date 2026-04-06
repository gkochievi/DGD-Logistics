from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from accounts.permissions import IsAdmin
from .models import Order, OrderStatusHistory, OrderImage
from .serializers import (
    OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer,
    AdminOrderUpdateSerializer, OrderImageSerializer,
)


# --- Customer views ---

class CustomerOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class CustomerActiveOrdersView(generics.ListAPIView):
    serializer_class = OrderListSerializer

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user,
            status__in=['new', 'under_review', 'approved', 'in_progress'],
        )


class CustomerOrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class CustomerOrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class CustomerCancelOrderView(APIView):
    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not order.is_cancellable:
            return Response(
                {'detail': 'This order cannot be cancelled in its current status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.status
        order.status = Order.STATUS_CANCELLED
        order.save()

        OrderStatusHistory.objects.create(
            order=order, old_status=old_status, new_status=Order.STATUS_CANCELLED,
            changed_by=request.user, comment='Cancelled by customer',
        )
        return Response({'detail': 'Order cancelled successfully.'})


class CustomerUploadImagesView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for img in images:
            obj = OrderImage.objects.create(order=order, image=img)
            created.append(OrderImageSerializer(obj).data)
        return Response(created, status=status.HTTP_201_CREATED)


# --- Admin views ---

class AdminOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'urgency', 'selected_category', 'final_category']
    search_fields = ['contact_name', 'contact_phone', 'pickup_location', 'description']
    ordering_fields = ['created_at', 'requested_date', 'status', 'urgency']

    def get_queryset(self):
        qs = Order.objects.all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


class AdminOrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Order.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminOrderUpdateSerializer
        return OrderDetailSerializer


class AdminOrderStatusChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        comment = request.data.get('comment', '')

        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        order.status = new_status
        if comment:
            order.admin_comment = comment
        order.save()

        OrderStatusHistory.objects.create(
            order=order, old_status=old_status, new_status=new_status,
            changed_by=request.user, comment=comment,
        )

        return Response(OrderDetailSerializer(order).data)
