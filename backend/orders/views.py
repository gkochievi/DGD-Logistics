from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db.models import Q

from accounts.permissions import IsAdmin
from .models import Order, OrderStatusHistory, OrderImage
from .serializers import (
    OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer,
    AdminOrderUpdateSerializer, OrderImageSerializer,
)


def _stamp_event(order, event_type, *, customer_unread=False, admin_unread=False, save=True):
    order.last_event_at = timezone.now()
    order.last_event_type = event_type
    if admin_unread:
        order.is_read_by_admin = False
    if customer_unread:
        order.is_read_by_customer = False
    if save:
        order.save(update_fields=['last_event_at', 'last_event_type',
                                  'is_read_by_admin', 'is_read_by_customer'])


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

    def retrieve(self, request, *args, **kwargs):
        order = self.get_object()
        if not order.is_read_by_customer:
            Order.objects.filter(pk=order.pk).update(is_read_by_customer=True)
            order.is_read_by_customer = True
        serializer = self.get_serializer(order)
        return Response(serializer.data)


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
        _stamp_event(order, 'cancelled', admin_unread=True)
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
        _stamp_event(order, 'images_added', admin_unread=True)
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

    def retrieve(self, request, *args, **kwargs):
        order = self.get_object()
        if not order.is_read_by_admin:
            Order.objects.filter(pk=order.pk).update(is_read_by_admin=True)
            order.is_read_by_admin = True
        serializer = self.get_serializer(order)
        return Response(serializer.data)


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
        _stamp_event(order, f'status:{new_status}', customer_unread=True)

        return Response(OrderDetailSerializer(order).data)


# --- Notifications (polling) ---

ADMIN_ACTIVE_STATUSES = ['new', 'under_review', 'approved', 'in_progress']
CUSTOMER_ACTIVE_STATUSES = ['new', 'under_review', 'approved', 'in_progress']


class AdminNotificationsView(APIView):
    """Cheap polling endpoint for the admin notification bell.

    Returns unread order count, recent unread orders, and overall counters
    the admin UI uses for nav badges.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = Order.objects.all()
        unread_qs = qs.filter(is_read_by_admin=False)

        recent = (unread_qs
                  .order_by('-last_event_at')[:15])
        recent_data = OrderListSerializer(recent, many=True, context={'request': request}).data

        latest_event = qs.order_by('-last_event_at').values_list('last_event_at', flat=True).first()

        return Response({
            'unread_count': unread_qs.count(),
            'new_orders_count': qs.filter(status='new').count(),
            'active_orders_count': qs.filter(status__in=ADMIN_ACTIVE_STATUSES).count(),
            'recent_unread': recent_data,
            'latest_event_at': latest_event.isoformat() if latest_event else None,
            'server_time': timezone.now().isoformat(),
        })


class AdminMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        ids = request.data.get('ids')
        qs = Order.objects.filter(is_read_by_admin=False)
        if isinstance(ids, list) and ids:
            qs = qs.filter(id__in=ids)
        updated = qs.update(is_read_by_admin=True)
        return Response({'marked': updated})


class CustomerNotificationsView(APIView):
    """Polling endpoint for customer notification badge."""

    def get(self, request):
        qs = Order.objects.filter(user=request.user)
        unread_qs = qs.filter(is_read_by_customer=False)

        recent = unread_qs.order_by('-last_event_at')[:15]
        recent_data = OrderListSerializer(recent, many=True, context={'request': request}).data

        latest_event = qs.order_by('-last_event_at').values_list('last_event_at', flat=True).first()

        return Response({
            'unread_count': unread_qs.count(),
            'active_orders_count': qs.filter(status__in=CUSTOMER_ACTIVE_STATUSES).count(),
            'recent_unread': recent_data,
            'latest_event_at': latest_event.isoformat() if latest_event else None,
            'server_time': timezone.now().isoformat(),
        })


class CustomerMarkAllReadView(APIView):
    def post(self, request):
        ids = request.data.get('ids')
        qs = Order.objects.filter(user=request.user, is_read_by_customer=False)
        if isinstance(ids, list) and ids:
            qs = qs.filter(id__in=ids)
        updated = qs.update(is_read_by_customer=True)
        return Response({'marked': updated})
