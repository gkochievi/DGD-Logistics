import json
from rest_framework import serializers
from categories.models import TransportCategory
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    car_categories = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=TransportCategory.objects.all(),
    )

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'image', 'image_url', 'color',
            'car_categories', 'requires_destination', 'is_active', 'suggestion_keywords',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def to_internal_value(self, data):
        mutable = {}
        for key in data:
            mutable[key] = data[key]
        # Preserve file fields from multipart (QueryDict returns last value by
        # default; files arrive as UploadedFile objects via data[key] already).
        # Parse JSON string fields
        for field in ('name', 'description'):
            if field in mutable and isinstance(mutable[field], str):
                try:
                    parsed = json.loads(mutable[field])
                    if isinstance(parsed, dict):
                        mutable[field] = parsed
                except (json.JSONDecodeError, TypeError):
                    pass
        # car_categories arrives as a JSON-encoded list from the multipart form;
        # JSON requests already send a list.
        if 'car_categories' in mutable and isinstance(mutable['car_categories'], str):
            raw = mutable['car_categories'].strip()
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    mutable['car_categories'] = parsed
            except (json.JSONDecodeError, TypeError):
                mutable['car_categories'] = [v for v in raw.split(',') if v.strip()]
        # Allow clearing the image via empty string
        if 'image' in mutable and mutable['image'] == '':
            mutable['image'] = None
        return super().to_internal_value(mutable)


class ServicePublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    car_categories = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'image_url', 'color',
            'car_categories', 'requires_destination',
        ]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
