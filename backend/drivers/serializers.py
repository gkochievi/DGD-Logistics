from rest_framework import serializers
from vehicles.models import Vehicle
from .models import Driver


class DriverVehicleBriefSerializer(serializers.ModelSerializer):
    category_name = serializers.JSONField(source='category.name', read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'name', 'plate_number', 'category_name', 'license_categories']


class DriverOrderBriefSerializer(serializers.Serializer):
    """Compact order row for driver/vehicle detail pages."""
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    pickup_location = serializers.CharField(read_only=True)
    destination_location = serializers.CharField(read_only=True)
    scheduled_from = serializers.DateTimeField(read_only=True)
    scheduled_to = serializers.DateTimeField(read_only=True)
    requested_date = serializers.DateField(read_only=True)


def _recent_active_orders(queryset, limit=10):
    from orders.models import Order
    return list(
        queryset.filter(status__in=Order.ACTIVE_STATUSES)
        .order_by('-last_event_at')[:limit]
    )


class DriverListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vehicles = DriverVehicleBriefSerializer(many=True, read_only=True)
    is_busy = serializers.BooleanField(read_only=True)
    active_orders_count = serializers.SerializerMethodField()

    def get_active_orders_count(self, obj):
        from orders.models import Order
        return obj.orders.filter(status__in=Order.ACTIVE_STATUSES).count()

    class Meta:
        model = Driver
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'phone', 'email',
            'license_number', 'license_categories', 'license_expiry',
            'photo', 'status', 'status_display', 'is_active', 'vehicles',
            'is_busy', 'active_orders_count',
        ]


def _parse_categories(raw):
    if not raw:
        return set()
    return {c.strip().upper() for c in raw.split(',') if c.strip()}


class DriverDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vehicles = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Vehicle.objects.all(), required=False
    )
    vehicles_detail = DriverVehicleBriefSerializer(source='vehicles', many=True, read_only=True)
    is_busy = serializers.BooleanField(read_only=True)
    active_orders = serializers.SerializerMethodField()

    def get_active_orders(self, obj):
        orders = _recent_active_orders(obj.orders.all())
        return DriverOrderBriefSerializer(orders, many=True).data

    class Meta:
        model = Driver
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'phone', 'email',
            'license_number', 'license_categories', 'license_expiry',
            'date_of_birth', 'hire_date', 'photo', 'notes',
            'status', 'status_display', 'is_active',
            'vehicles', 'vehicles_detail',
            'is_busy', 'active_orders',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        vehicles = attrs.get('vehicles')
        if vehicles is None:
            return attrs
        driver_cats = _parse_categories(
            attrs.get('license_categories', getattr(self.instance, 'license_categories', ''))
        )
        for v in vehicles:
            required = _parse_categories(v.license_categories)
            missing = required - driver_cats
            if missing:
                raise serializers.ValidationError({
                    'vehicles': (
                        f"Driver license does not cover {v.name} ({v.plate_number}). "
                        f"Missing categories: {', '.join(sorted(missing))}."
                    )
                })
        return attrs
