import json

from rest_framework import serializers
from .models import Order, OrderImage, OrderStatusHistory, OrderEditHistory
from .assignment import validate_assignment, sync_vehicle_status
from categories.serializers import TransportCategoryPublicSerializer
from services.serializers import ServicePublicSerializer
from accounts.serializers import UserSerializer
from vehicles.serializers import VehicleListSerializer


class OrderAssignedDriverSerializer(serializers.Serializer):
    """Minimal driver payload nested into OrderDetail."""
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    license_number = serializers.CharField(read_only=True)
    license_categories = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        if not getattr(obj, 'photo', None):
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url


class OrderImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderImage
        fields = ['id', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default='')

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'old_status', 'new_status', 'changed_by', 'changed_by_name',
            'comment', 'created_at', 'is_auto_promotion',
        ]


class OrderEditHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default='')

    class Meta:
        model = OrderEditHistory
        fields = ['id', 'field_name', 'old_value', 'new_value', 'changed_by', 'changed_by_name', 'changed_at']


class OrderListSerializer(serializers.ModelSerializer):
    # Primary customer-facing taxonomy is now Service; these fields preserve
    # the old *_category_* names so the frontend doesn't need a dual-path,
    # but their values come from Service (with legacy category as fallback
    # for orders created before services existed).
    selected_category_name = serializers.SerializerMethodField()
    selected_category_icon = serializers.SerializerMethodField()
    selected_category_image = serializers.SerializerMethodField()
    selected_category_color = serializers.SerializerMethodField()
    final_category_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    image_count = serializers.IntegerField(source='images.count', read_only=True)
    is_unread = serializers.SerializerMethodField()
    # Light-weight customer summary fields. Avoid embedding the full
    # UserSerializer here — the admin orders list only needs name + email +
    # phone for the Customer column, and this keeps the payload small.
    user_full_name = serializers.CharField(source='user.full_name', read_only=True, default='')
    user_email = serializers.CharField(source='user.email', read_only=True, default='')
    user_phone = serializers.CharField(source='user.phone_number', read_only=True, default='')

    def _primary_selected(self, obj):
        return obj.selected_service or obj.selected_category

    def _primary_final(self, obj):
        return obj.final_service or obj.final_category

    def get_is_unread(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role == 'admin':
            return not obj.is_read_by_admin
        if obj.user_id == request.user.id:
            return not obj.is_read_by_customer
        return False

    def get_selected_category_name(self, obj):
        primary = self._primary_selected(obj)
        return primary.name if primary else ''

    def get_selected_category_icon(self, obj):
        primary = self._primary_selected(obj)
        return (primary.icon if primary else '') or 'car'

    def get_selected_category_color(self, obj):
        primary = self._primary_selected(obj)
        return (primary.color if primary else '') or '#1677ff'

    def get_final_category_name(self, obj):
        primary = self._primary_final(obj)
        return primary.name if primary else ''

    def get_selected_category_image(self, obj):
        primary = self._primary_selected(obj)
        if primary and getattr(primary, 'image', None):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None

    class Meta:
        model = Order
        fields = [
            'id', 'pickup_location', 'destination_location', 'requested_date',
            'requested_time', 'contact_name', 'contact_phone',
            'user_full_name', 'user_email', 'user_phone',
            'status', 'status_display',
            'urgency', 'urgency_display', 'selected_category_name',
            'selected_category_icon', 'selected_category_image', 'selected_category_color',
            'final_category_name', 'is_cancellable', 'image_count', 'created_at',
            'is_unread', 'last_event_at', 'last_event_type', 'price',
            'customer_accepted_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    images = OrderImageSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    edit_history = OrderEditHistorySerializer(many=True, read_only=True)
    admin_edited_by_name = serializers.CharField(
        source='admin_edited_by.full_name', read_only=True, default='',
    )
    selected_service_detail = ServicePublicSerializer(source='selected_service', read_only=True)
    suggested_service_detail = ServicePublicSerializer(source='suggested_service', read_only=True)
    final_service_detail = ServicePublicSerializer(source='final_service', read_only=True)
    selected_category_detail = TransportCategoryPublicSerializer(source='selected_category', read_only=True)
    suggested_category_detail = TransportCategoryPublicSerializer(source='suggested_category', read_only=True)
    final_category_detail = TransportCategoryPublicSerializer(source='final_category', read_only=True)
    assigned_vehicle_detail = VehicleListSerializer(source='assigned_vehicle', read_only=True)
    assigned_driver_detail = OrderAssignedDriverSerializer(source='assigned_driver', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)
    # Stored as a JSON string in a TextField; parse it so clients receive
    # {pickups:[...], destinations:[...], distance, duration} instead of a
    # raw string they'd have to JSON.parse themselves.
    route_stops = serializers.SerializerMethodField()

    def get_route_stops(self, obj):
        if not obj.route_stops:
            return None
        try:
            return json.loads(obj.route_stops)
        except (ValueError, TypeError):
            return None

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_detail',
            'suggested_service', 'suggested_service_detail',
            'selected_service', 'selected_service_detail',
            'final_service', 'final_service_detail',
            'suggested_category', 'suggested_category_detail',
            'selected_category', 'selected_category_detail',
            'final_category', 'final_category_detail',
            'assigned_vehicle', 'assigned_vehicle_detail',
            'assigned_driver', 'assigned_driver_detail',
            'scheduled_from', 'scheduled_to',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination_location', 'destination_lat', 'destination_lng',
            'requested_date', 'requested_time',
            'contact_name', 'contact_phone',
            'description', 'cargo_details',
            'urgency', 'urgency_display',
            'status', 'status_display',
            'admin_comment', 'user_note', 'route_stops',
            'price', 'customer_accepted_at',
            'admin_edited_at', 'admin_edited_by', 'admin_edited_by_name',
            'is_cancellable',
            'images', 'status_history', 'edit_history',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'status', 'price', 'customer_accepted_at',
            'admin_edited_at', 'admin_edited_by', 'created_at', 'updated_at',
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Order
        fields = [
            'id',
            'selected_service', 'suggested_service',
            'selected_category', 'suggested_category',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination_location', 'destination_lat', 'destination_lng',
            'requested_date', 'requested_time',
            'contact_name', 'contact_phone',
            'description', 'cargo_details',
            'urgency', 'user_note', 'route_stops', 'images',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'selected_service': {'required': False, 'allow_null': True},
            'suggested_service': {'required': False, 'allow_null': True},
            'selected_category': {'required': False, 'allow_null': True},
            'suggested_category': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        """Reject orders whose requested_time falls inside a restricted window
        for any matching pickup/destination/route stop. Mirrors the
        customer-side disable so a hand-crafted POST can't bypass the rule.
        Also enforces that a destination is provided when the chosen service
        requires it (transport-style services).
        """
        from site_settings.models import RestrictedTimeWindow

        # Enforce destination requirement based on the selected Service.
        selected_service = attrs.get('selected_service')
        if selected_service is not None and getattr(selected_service, 'requires_destination', False):
            if not (attrs.get('destination_location') or '').strip():
                raise serializers.ValidationError({
                    'destination_location': 'This service requires a destination address.'
                })

        requested_time = attrs.get('requested_time')
        if requested_time is None:
            return attrs

        # Collect every text location attached to the order so any stop in a
        # restricted city is enough to block the chosen time.
        location_texts = [
            attrs.get('pickup_location') or '',
            attrs.get('destination_location') or '',
        ]
        route_stops_raw = attrs.get('route_stops') or ''
        if route_stops_raw:
            try:
                parsed = json.loads(route_stops_raw)
            except (ValueError, TypeError):
                parsed = None
            if isinstance(parsed, dict):
                for key in ('pickups', 'destinations'):
                    for stop in parsed.get(key, []) or []:
                        if isinstance(stop, dict) and stop.get('address'):
                            location_texts.append(str(stop['address']))

        for window in RestrictedTimeWindow.objects.filter(is_active=True):
            if not window.covers_time(requested_time):
                continue
            if any(window.matches_location(t) for t in location_texts):
                detail = window.description or (
                    f'Special transport is not allowed in {window.location_keyword} '
                    f'between {window.start_time.strftime("%H:%M")} and '
                    f'{window.end_time.strftime("%H:%M")}.'
                )
                raise serializers.ValidationError({'requested_time': detail})
        return attrs

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        user = self.context['request'].user
        order = Order.objects.create(
            user=user,
            is_read_by_admin=False,
            is_read_by_customer=True,
            last_event_type='created',
            **validated_data,
        )

        for image_file in images_data:
            OrderImage.objects.create(order=order, image=image_file)

        OrderStatusHistory.objects.create(
            order=order, old_status='', new_status=Order.STATUS_NEW,
            changed_by=user, comment='Order created',
        )
        return order


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    # Fields an admin may edit on the customer's behalf. Changes to any of
    # these get logged to OrderEditHistory and stamp admin_edited_at. Admin
    # workflow fields (status/price/assignment/admin_comment) are tracked
    # separately via OrderStatusHistory or aren't customer-visible data.
    CUSTOMER_EDITABLE_FIELDS = [
        'pickup_location', 'pickup_lat', 'pickup_lng',
        'destination_location', 'destination_lat', 'destination_lng',
        'requested_date', 'requested_time',
        'contact_name', 'contact_phone',
        'description', 'cargo_details',
        'urgency', 'route_stops',
    ]

    class Meta:
        model = Order
        fields = [
            'final_service', 'final_category', 'assigned_vehicle', 'assigned_driver',
            'scheduled_from', 'scheduled_to',
            'admin_comment', 'status', 'urgency', 'price',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination_location', 'destination_lat', 'destination_lng',
            'requested_date', 'requested_time',
            'contact_name', 'contact_phone',
            'description', 'cargo_details', 'route_stops',
        ]

    def validate(self, attrs):
        """Run cross-field assignment validation against merged state."""
        instance = self.instance

        # Terminal orders are frozen — no field edits allowed.
        if instance.status in Order.RELEASED_STATUSES:
            raise serializers.ValidationError({
                'status': f'Order is {instance.get_status_display().lower()} and cannot be modified.'
            })

        def resolved(field):
            return attrs[field] if field in attrs else getattr(instance, field, None)

        target_vehicle = resolved('assigned_vehicle')
        target_driver = resolved('assigned_driver')
        target_from = resolved('scheduled_from')
        target_to = resolved('scheduled_to')
        target_status = resolved('status')
        target_price = resolved('price')

        # Cancellation is customer-initiated only; admins end orders via "rejected".
        status_changing_to_cancelled = (
            target_status == Order.STATUS_CANCELLED
            and instance.status != Order.STATUS_CANCELLED
        )
        if status_changing_to_cancelled:
            raise serializers.ValidationError({
                'status': 'Cancellation is reserved for the customer. Use "rejected" to end the order.'
            })

        # "Approved" now means the customer has accepted the offer. Admins
        # send offers via STATUS_OFFER_SENT; only the customer accept action
        # promotes an order into approved.
        status_changing_to_approved = (
            target_status == Order.STATUS_APPROVED
            and instance.status != Order.STATUS_APPROVED
        )
        if status_changing_to_approved:
            raise serializers.ValidationError({
                'status': 'Approved is reserved for customer acceptance. Use "offer sent" to send a price offer.'
            })

        # "New" is the entry state; admins can't move an order back to it.
        status_changing_to_new = (
            target_status == Order.STATUS_NEW
            and instance.status != Order.STATUS_NEW
        )
        if status_changing_to_new:
            raise serializers.ValidationError({
                'status': 'Orders cannot be moved back to "new".'
            })

        # Sending the offer requires a price — the customer needs a quote
        # to accept or reject.
        status_changing_to_offer_sent = (
            target_status == Order.STATUS_OFFER_SENT
            and instance.status != Order.STATUS_OFFER_SENT
        )
        if status_changing_to_offer_sent and (target_price is None or target_price <= 0):
            raise serializers.ValidationError({
                'price': 'Set a price before sending the offer to the customer.'
            })

        # Starting work requires the customer to have accepted — i.e. the
        # order must already be in `approved`.
        status_changing_to_in_progress = (
            target_status == Order.STATUS_IN_PROGRESS
            and instance.status != Order.STATUS_IN_PROGRESS
        )
        if status_changing_to_in_progress and instance.status != Order.STATUS_APPROVED:
            raise serializers.ValidationError({
                'status': 'Customer must accept the offer before starting the job.'
            })

        # Completing the order is only valid once work is actually in progress —
        # jumping straight from new/offer_sent/etc. to completed would skip
        # acceptance and billing.
        status_changing_to_completed = (
            target_status == Order.STATUS_COMPLETED
            and instance.status != Order.STATUS_COMPLETED
        )
        if status_changing_to_completed and instance.status != Order.STATUS_IN_PROGRESS:
            raise serializers.ValidationError({
                'status': 'Only an in-progress order can be marked as completed.'
            })

        # Block backward moves along the lifecycle. Rejected stays reachable
        # from any non-released status because it's a terminal exit, not a
        # rewind — once the customer has accepted (approved), the order can
        # no longer be rewound to under_review or offer_sent.
        if (
            instance.status in Order.STATUS_PROGRESSION
            and target_status in Order.STATUS_PROGRESSION
            and Order.STATUS_PROGRESSION.index(target_status)
            < Order.STATUS_PROGRESSION.index(instance.status)
        ):
            raise serializers.ValidationError({
                'status': 'Orders cannot be moved backward to an earlier status.'
            })

        validate_assignment(
            instance,
            vehicle=target_vehicle,
            driver=target_driver,
            scheduled_from=target_from,
            scheduled_to=target_to,
            target_status=target_status,
        )
        return attrs

    def update(self, instance, validated_data):
        from django.utils import timezone
        request_user = self.context['request'].user
        new_status = validated_data.get('status')
        status_changed = bool(new_status) and new_status != instance.status
        # Track vehicles whose status may need to be re-synced:
        # the old vehicle (if reassigned) and the new vehicle.
        old_vehicle = instance.assigned_vehicle
        new_vehicle = validated_data.get('assigned_vehicle', old_vehicle)

        # Snapshot pre-save deltas for customer-editable fields so each
        # change is recorded in OrderEditHistory after the save succeeds.
        edit_changes = []
        for field in self.CUSTOMER_EDITABLE_FIELDS:
            if field not in validated_data:
                continue
            old_value = getattr(instance, field)
            new_value = validated_data[field]
            if field == 'route_stops':
                # Stored as a JSON string — compare parsed structures so
                # trivial re-serializations don't generate phantom log rows.
                try:
                    if json.loads(old_value or 'null') == json.loads(new_value or 'null'):
                        continue
                except (ValueError, TypeError):
                    pass
            if old_value != new_value:
                edit_changes.append((field, old_value, new_value))

        now = timezone.now()

        if status_changed:
            OrderStatusHistory.objects.create(
                order=instance,
                old_status=instance.status,
                new_status=new_status,
                changed_by=request_user,
                comment=validated_data.get('admin_comment', ''),
            )
            instance.is_read_by_customer = False
            instance.last_event_type = f'status:{new_status}'
            instance.last_event_at = now
        elif validated_data:
            instance.is_read_by_customer = False
            instance.last_event_type = 'edited' if edit_changes else 'updated'
            instance.last_event_at = now

        if edit_changes:
            instance.admin_edited_at = now
            instance.admin_edited_by = request_user

        result = super().update(instance, validated_data)

        for field_name, old_value, new_value in edit_changes:
            OrderEditHistory.objects.create(
                order=instance,
                field_name=field_name,
                old_value='' if old_value in (None, '') else str(old_value),
                new_value='' if new_value in (None, '') else str(new_value),
                changed_by=request_user,
            )

        # Keep vehicle.status aligned with active assignments.
        sync_vehicle_status(old_vehicle)
        if new_vehicle and new_vehicle != old_vehicle:
            sync_vehicle_status(new_vehicle)

        return result


class AdminCommentSerializer(serializers.Serializer):
    comment = serializers.CharField()
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=False)
