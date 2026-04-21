from rest_framework import serializers
from .models import Vehicle, VehicleImage


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class VehicleListSerializer(serializers.ModelSerializer):
    category_name = serializers.JSONField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_image = serializers.SerializerMethodField()
    category_color = serializers.CharField(source='category.color', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)
    active_orders_count = serializers.SerializerMethodField()

    def get_category_image(self, obj):
        if obj.category and obj.category.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.category.image.url)
            return obj.category.image.url
        return None

    def get_active_orders_count(self, obj):
        from orders.models import Order
        return obj.orders.filter(status__in=Order.ACTIVE_STATUSES).count()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category', 'category_name', 'category_icon', 'category_image',
            'category_color', 'plate_number', 'year', 'capacity', 'license_categories',
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
    category_name = serializers.JSONField(source='category.name', read_only=True)
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
            'id', 'name', 'category', 'category_name',
            'plate_number', 'year', 'capacity', 'description', 'license_categories',
            'price_per_hour', 'price_per_km',
            'image', 'status', 'status_display', 'is_active',
            'images', 'drivers', 'active_orders',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehiclePublicSerializer(serializers.ModelSerializer):
    category_name = serializers.JSONField(source='category.name', read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category', 'category_name',
            'capacity', 'price_per_hour', 'price_per_km', 'image',
            'images',
        ]
