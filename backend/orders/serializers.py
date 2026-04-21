from rest_framework import serializers
from .models import Order, OrderImage, OrderStatusHistory
from .assignment import validate_assignment, sync_vehicle_status
from categories.serializers import TransportCategoryPublicSerializer
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


class OrderImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderImage
        fields = ['id', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default='')

    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by', 'changed_by_name', 'comment', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    selected_category_name = serializers.SerializerMethodField()
    selected_category_icon = serializers.CharField(
        source='selected_category.icon', read_only=True, default='car'
    )
    selected_category_image = serializers.SerializerMethodField()
    selected_category_color = serializers.CharField(
        source='selected_category.color', read_only=True, default='#1677ff'
    )
    final_category_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    image_count = serializers.IntegerField(source='images.count', read_only=True)
    is_unread = serializers.SerializerMethodField()

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
        if obj.selected_category:
            return obj.selected_category.name
        return ''

    def get_final_category_name(self, obj):
        if obj.final_category:
            return obj.final_category.name
        return ''

    def get_selected_category_image(self, obj):
        if obj.selected_category and obj.selected_category.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.selected_category.image.url)
            return obj.selected_category.image.url
        return None

    class Meta:
        model = Order
        fields = [
            'id', 'pickup_location', 'destination_location', 'requested_date',
            'requested_time', 'contact_name', 'status', 'status_display',
            'urgency', 'urgency_display', 'selected_category_name',
            'selected_category_icon', 'selected_category_image', 'selected_category_color',
            'final_category_name', 'is_cancellable', 'image_count', 'created_at',
            'is_unread', 'last_event_at', 'last_event_type',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    images = OrderImageSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    selected_category_detail = TransportCategoryPublicSerializer(source='selected_category', read_only=True)
    suggested_category_detail = TransportCategoryPublicSerializer(source='suggested_category', read_only=True)
    final_category_detail = TransportCategoryPublicSerializer(source='final_category', read_only=True)
    assigned_vehicle_detail = VehicleListSerializer(source='assigned_vehicle', read_only=True)
    assigned_driver_detail = OrderAssignedDriverSerializer(source='assigned_driver', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_detail',
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
            'is_cancellable',
            'images', 'status_history',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Order
        fields = [
            'id',
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
            'selected_category': {'required': False, 'allow_null': True},
        }

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
    class Meta:
        model = Order
        fields = [
            'final_category', 'assigned_vehicle', 'assigned_driver',
            'scheduled_from', 'scheduled_to',
            'admin_comment', 'status', 'urgency',
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
        new_status = validated_data.get('status')
        status_changed = bool(new_status) and new_status != instance.status
        # Track vehicles whose status may need to be re-synced:
        # the old vehicle (if reassigned) and the new vehicle.
        old_vehicle = instance.assigned_vehicle
        new_vehicle = validated_data.get('assigned_vehicle', old_vehicle)

        if status_changed:
            OrderStatusHistory.objects.create(
                order=instance,
                old_status=instance.status,
                new_status=new_status,
                changed_by=self.context['request'].user,
                comment=validated_data.get('admin_comment', ''),
            )
            instance.is_read_by_customer = False
            instance.last_event_type = f'status:{new_status}'
            instance.last_event_at = timezone.now()
        elif validated_data:
            instance.is_read_by_customer = False
            instance.last_event_type = 'updated'
            instance.last_event_at = timezone.now()

        result = super().update(instance, validated_data)

        # Keep vehicle.status aligned with active assignments.
        sync_vehicle_status(old_vehicle)
        if new_vehicle and new_vehicle != old_vehicle:
            sync_vehicle_status(new_vehicle)

        return result


class AdminCommentSerializer(serializers.Serializer):
    comment = serializers.CharField()
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=False)
