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

    def get_category_image(self, obj):
        if obj.category and obj.category.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.category.image.url)
            return obj.category.image.url
        return None

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category', 'category_name', 'category_icon', 'category_image',
            'category_color', 'plate_number', 'year', 'capacity', 'license_categories',
            'price_per_hour', 'price_per_km', 'image', 'status', 'status_display', 'is_active',
            'images',
        ]


class VehicleDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.JSONField(source='category.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    images = VehicleImageSerializer(many=True, read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'name', 'category', 'category_name',
            'plate_number', 'year', 'capacity', 'description', 'license_categories',
            'price_per_hour', 'price_per_km',
            'image', 'status', 'status_display', 'is_active',
            'images',
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
