from rest_framework import serializers
from .models import Vehicle, VehicleImage


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'order', 'is_primary', 'created_at']
        read_only_fields = ['id', 'is_primary', 'created_at']


class VehicleCategoryBriefSerializer(serializers.Serializer):
    """Inline category summary for vehicle payloads (multi-category support)."""
    id = serializers.IntegerField(read_only=True)
    name = serializers.JSONField(read_only=True)
    icon = serializers.CharField(read_only=True)
    color = serializers.CharField(read_only=True)
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class VehicleListSerializer(serializers.ModelSerializer):
    categories_detail = VehicleCategoryBriefSerializer(source='categories', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)
    active_orders_count = serializers.SerializerMethodField()

    def get_active_orders_count(self, obj):
        from orders.models import Order
        return obj.orders.filter(status__in=Order.ACTIVE_STATUSES).count()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'categories', 'categories_detail',
            'plate_number', 'year', 'capacity', 'license_categories',
            'price_per_hour', 'price_per_km', 'image', 'status', 'status_display', 'is_active',
            'images', 'active_orders_count',
        ]


class VehicleAssignedDriverBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


class VehicleActiveOrderBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    pickup_location = serializers.CharField(read_only=True)
    destination_location = serializers.CharField(read_only=True)
    scheduled_from = serializers.DateTimeField(read_only=True)
    scheduled_to = serializers.DateTimeField(read_only=True)
    requested_date = serializers.DateField(read_only=True)
    assigned_driver_name = serializers.SerializerMethodField()

    def get_assigned_driver_name(self, obj):
        return obj.assigned_driver.full_name if obj.assigned_driver_id else ''


class VehicleDetailSerializer(serializers.ModelSerializer):
    categories_detail = VehicleCategoryBriefSerializer(source='categories', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)
    drivers = VehicleAssignedDriverBriefSerializer(many=True, read_only=True)
    active_orders = serializers.SerializerMethodField()

    def get_active_orders(self, obj):
        from orders.models import Order
        orders = list(
            obj.orders.filter(status__in=Order.ACTIVE_STATUSES)
            .select_related('assigned_driver')
            .order_by('-last_event_at')[:10]
        )
        return VehicleActiveOrderBriefSerializer(orders, many=True).data

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'categories', 'categories_detail',
            'plate_number', 'year', 'capacity', 'description', 'license_categories',
            'price_per_hour', 'price_per_km',
            'image', 'status', 'status_display', 'is_active',
            'images', 'drivers', 'active_orders',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehiclePublicSerializer(serializers.ModelSerializer):
    categories_detail = VehicleCategoryBriefSerializer(source='categories', many=True, read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'categories', 'categories_detail',
            'capacity', 'price_per_hour', 'price_per_km', 'image',
            'images',
        ]
