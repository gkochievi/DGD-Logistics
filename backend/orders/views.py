import csv

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from accounts.permissions import IsAdmin
from rest_framework.exceptions import ValidationError
from .models import Order, OrderStatusHistory, OrderImage
from .assignment import sync_vehicle_status, validate_assignment
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
            status__in=['new', 'under_review', 'offer_sent', 'approved', 'in_progress'],
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

        reason = (request.data.get('reason') or '').strip()[:500]
        was_offer = order.status == Order.STATUS_OFFER_SENT
        default_label = 'Offer rejected by customer' if was_offer else 'Cancelled by customer'
        comment = f'{default_label}: {reason}' if reason else default_label

        old_status = order.status
        order.status = Order.STATUS_CANCELLED
        order.save()

        OrderStatusHistory.objects.create(
            order=order, old_status=old_status, new_status=Order.STATUS_CANCELLED,
            changed_by=request.user, comment=comment,
        )
        _stamp_event(order, 'cancelled', admin_unread=True)
        # Release the vehicle if it was assigned (approved orders hold one).
        sync_vehicle_status(order.assigned_vehicle)
        return Response({'detail': 'Order cancelled successfully.'})


class CustomerAcceptOfferView(APIView):
    """Customer accepts the admin's price offer — transitions offer_sent to approved.

    `approved` means the customer has committed. Records acceptance timestamp,
    notifies admin, and unlocks the `in_progress` transition on the admin side.
    """

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != Order.STATUS_OFFER_SENT:
            return Response(
                {'detail': 'Offer can only be accepted while waiting for your approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.price is None or order.price <= 0:
            return Response(
                {'detail': 'No price has been set for this order yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.status
        order.status = Order.STATUS_APPROVED
        order.customer_accepted_at = timezone.now()
        order.save(update_fields=['status', 'customer_accepted_at'])

        OrderStatusHistory.objects.create(
            order=order, old_status=old_status, new_status=order.status,
            changed_by=request.user, comment='Customer accepted the price offer',
        )
        _stamp_event(order, f'status:{Order.STATUS_APPROVED}', admin_unread=True)
        return Response(OrderDetailSerializer(order, context={'request': request}).data)


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
    filterset_fields = ['status', 'urgency', 'selected_service', 'final_service',
                        'selected_category', 'final_category', 'assigned_vehicle']
    # Free-text `search` hits the customer (User) fields first, plus the
    # contact name/phone that the order carries. Location/description are
    # intentionally out — admins filter location via specific fields when
    # needed, not via a generic search.
    search_fields = [
        'user__first_name', 'user__last_name',
        'user__email', 'user__phone_number', 'user__company_name',
        'contact_name', 'contact_phone',
    ]
    ordering_fields = ['id', 'created_at', 'requested_date', 'status', 'urgency']

    def get_queryset(self):
        # `user` is needed for every row of the admin orders list (Customer
        # column). select_related avoids one User query per visible order.
        qs = Order.objects.select_related('user').all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        # `date_from` / `date_to` filter on created_at (used by the admin
        # dashboard and reports). `requested_date_from`/`_to` filter on the
        # customer's requested_date so admins can scope by scheduled day.
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        req_date_from = self.request.query_params.get('requested_date_from')
        req_date_to = self.request.query_params.get('requested_date_to')
        if req_date_from:
            qs = qs.filter(requested_date__gte=req_date_from)
        if req_date_to:
            qs = qs.filter(requested_date__lte=req_date_to)
        requested_time = self.request.query_params.get('requested_time')
        if requested_time:
            qs = qs.filter(requested_time=requested_time)
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
        # First admin view of a fresh order moves it into review so the
        # customer immediately sees it's being worked on.
        if order.status == Order.STATUS_NEW:
            old_status = order.status
            order.status = Order.STATUS_UNDER_REVIEW
            order.save(update_fields=['status'])
            OrderStatusHistory.objects.create(
                order=order, old_status=old_status,
                new_status=Order.STATUS_UNDER_REVIEW,
                changed_by=request.user,
                comment='Opened by admin',
            )
            _stamp_event(order, f'status:{Order.STATUS_UNDER_REVIEW}', customer_unread=True)
        serializer = self.get_serializer(order)
        return Response(serializer.data)


class AdminOrderStatusChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status in Order.RELEASED_STATUSES:
            return Response(
                {'detail': f'Order is {order.get_status_display().lower()} and cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get('status')
        comment = request.data.get('comment', '')

        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cancellation is customer-initiated only; admins end orders via "rejected".
        if new_status == Order.STATUS_CANCELLED:
            return Response(
                {'detail': 'Cancellation is reserved for the customer. Use "rejected" to end the order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # "New" is the entry state; admins can't move an order back to it.
        if new_status == Order.STATUS_NEW and order.status != Order.STATUS_NEW:
            return Response(
                {'detail': 'Orders cannot be moved back to "new".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # "Approved" now means the customer has accepted — admins cannot set
        # it directly. Use "offer_sent" to send the price for approval.
        if new_status == Order.STATUS_APPROVED and order.status != Order.STATUS_APPROVED:
            return Response(
                {'detail': 'Approved is reserved for customer acceptance. Use "offer sent" to send a price offer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Sending the offer requires a price.
        if (
            new_status == Order.STATUS_OFFER_SENT
            and order.status != Order.STATUS_OFFER_SENT
            and (order.price is None or order.price <= 0)
        ):
            return Response(
                {'detail': 'Set a price before sending the offer to the customer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Starting work requires the order to be approved (customer accepted).
        if (
            new_status == Order.STATUS_IN_PROGRESS
            and order.status != Order.STATUS_IN_PROGRESS
            and order.status != Order.STATUS_APPROVED
        ):
            return Response(
                {'detail': 'Customer must accept the offer before starting the job.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Completion is only reachable from in_progress — skipping acceptance
        # would complete an order the customer never agreed to.
        if (
            new_status == Order.STATUS_COMPLETED
            and order.status != Order.STATUS_COMPLETED
            and order.status != Order.STATUS_IN_PROGRESS
        ):
            return Response(
                {'detail': 'Only an in-progress order can be marked as completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Block backward moves along the lifecycle. Rejected stays reachable
        # from any non-released status because it's a terminal exit, not a
        # rewind — once the customer has accepted (approved), the order can
        # no longer be rewound to under_review or offer_sent.
        if (
            order.status in Order.STATUS_PROGRESSION
            and new_status in Order.STATUS_PROGRESSION
            and Order.STATUS_PROGRESSION.index(new_status)
            < Order.STATUS_PROGRESSION.index(order.status)
        ):
            return Response(
                {'detail': 'Orders cannot be moved backward to an earlier status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transitioning into an active state re-checks assignments for conflicts.
        if new_status in Order.ACTIVE_STATUSES and new_status != order.status:
            try:
                validate_assignment(
                    order,
                    vehicle=order.assigned_vehicle,
                    driver=order.assigned_driver,
                    scheduled_from=order.scheduled_from,
                    scheduled_to=order.scheduled_to,
                    target_status=new_status,
                )
            except ValidationError as e:
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

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

        # Re-sync vehicle availability after status change.
        sync_vehicle_status(order.assigned_vehicle)

        return Response(OrderDetailSerializer(order).data)


# --- CSV export ---

ORDER_EXPORT_COLUMNS = [
    'ID', 'Created', 'Status', 'Urgency',
    'Customer name', 'Customer email', 'Customer phone', 'Company',
    'Contact name', 'Contact phone',
    'Pickup location', 'Pickup lat', 'Pickup lng',
    'Destination location', 'Destination lat', 'Destination lng',
    'Requested date', 'Requested time',
    'Service', 'Category',
    'Assigned vehicle', 'Vehicle plate', 'Assigned driver',
    'Scheduled from', 'Scheduled to',
    'Price', 'Customer accepted at',
    'Description', 'Cargo details', 'Admin comment', 'User note',
]


def _multilingual(value):
    if isinstance(value, dict):
        return value.get('en') or next((v for v in value.values() if v), '') or ''
    return value or ''


def _order_export_row(order):
    user = order.user
    service = order.final_service or order.selected_service
    category = order.final_category or order.selected_category
    vehicle = order.assigned_vehicle
    driver = order.assigned_driver
    return [
        order.id,
        order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else '',
        order.get_status_display(),
        order.get_urgency_display(),
        getattr(user, 'full_name', '') or f'{user.first_name} {user.last_name}'.strip(),
        getattr(user, 'email', ''),
        getattr(user, 'phone_number', ''),
        getattr(user, 'company_name', '') or '',
        order.contact_name,
        order.contact_phone,
        order.pickup_location,
        order.pickup_lat if order.pickup_lat is not None else '',
        order.pickup_lng if order.pickup_lng is not None else '',
        order.destination_location,
        order.destination_lat if order.destination_lat is not None else '',
        order.destination_lng if order.destination_lng is not None else '',
        order.requested_date.isoformat() if order.requested_date else '',
        order.requested_time.strftime('%H:%M') if order.requested_time else '',
        _multilingual(service.name) if service else '',
        _multilingual(category.name) if category else '',
        vehicle.name if vehicle else '',
        vehicle.plate_number if vehicle else '',
        driver.full_name if driver else '',
        order.scheduled_from.strftime('%Y-%m-%d %H:%M') if order.scheduled_from else '',
        order.scheduled_to.strftime('%Y-%m-%d %H:%M') if order.scheduled_to else '',
        order.price if order.price is not None else '',
        order.customer_accepted_at.strftime('%Y-%m-%d %H:%M') if order.customer_accepted_at else '',
        order.description,
        order.cargo_details,
        order.admin_comment,
        order.user_note,
    ]


def _csv_response(filename, rows):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    # BOM so Excel opens UTF-8 (Cyrillic/Georgian) cleanly.
    response.write('﻿')
    writer = csv.writer(response)
    for row in rows:
        writer.writerow(row)
    return response


class AdminOrdersExportView(APIView):
    """Stream filtered orders as CSV. Respects the same filter params as the
    admin list view, plus optional `date_from`/`date_to` on created_at."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = Order.objects.select_related(
            'user', 'assigned_vehicle', 'assigned_driver',
            'selected_service', 'final_service',
            'selected_category', 'final_category',
        ).all()

        status_filter = request.query_params.get('status')
        urgency = request.query_params.get('urgency')
        service = request.query_params.get('selected_service') or request.query_params.get('service')
        vehicle = request.query_params.get('assigned_vehicle') or request.query_params.get('vehicle')
        user_id = request.query_params.get('user_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        req_date_from = request.query_params.get('requested_date_from')
        req_date_to = request.query_params.get('requested_date_to')
        requested_time = request.query_params.get('requested_time')
        search = request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if urgency:
            qs = qs.filter(urgency=urgency)
        if service:
            qs = qs.filter(selected_service_id=service)
        if vehicle:
            qs = qs.filter(assigned_vehicle_id=vehicle)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if req_date_from:
            qs = qs.filter(requested_date__gte=req_date_from)
        if req_date_to:
            qs = qs.filter(requested_date__lte=req_date_to)
        if requested_time:
            qs = qs.filter(requested_time=requested_time)
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__phone_number__icontains=search)
                | Q(user__company_name__icontains=search)
                | Q(contact_name__icontains=search)
                | Q(contact_phone__icontains=search)
            )

        stamp = timezone.now().strftime('%Y%m%d_%H%M')
        range_suffix = ''
        if date_from or date_to:
            range_suffix = f'_{date_from or "start"}_to_{date_to or "end"}'
        filename = f'orders{range_suffix}_{stamp}.csv'

        rows = [ORDER_EXPORT_COLUMNS]
        for order in qs.order_by('-created_at'):
            rows.append(_order_export_row(order))
        return _csv_response(filename, rows)


class AdminOrderExportDetailView(APIView):
    """Export a single order as a two-column CSV (Field, Value)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            order = Order.objects.select_related(
                'user', 'assigned_vehicle', 'assigned_driver',
                'selected_service', 'final_service',
                'selected_category', 'final_category',
            ).get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        row = _order_export_row(order)
        rows = [['Field', 'Value']]
        rows.extend(zip(ORDER_EXPORT_COLUMNS, row))
        filename = f'order_{order.id}.csv'
        return _csv_response(filename, rows)


# --- Notifications (polling) ---

ADMIN_ACTIVE_STATUSES = ['new', 'under_review', 'offer_sent', 'approved', 'in_progress']
CUSTOMER_ACTIVE_STATUSES = ['new', 'under_review', 'offer_sent', 'approved', 'in_progress']


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
