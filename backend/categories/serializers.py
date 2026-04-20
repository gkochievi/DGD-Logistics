import json
from rest_framework import serializers
from .models import TransportCategory


class TransportCategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TransportCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'image', 'image_url', 'color',
            'requires_destination', 'is_active', 'suggestion_keywords',
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
        # Preserve file fields from multipart
        if hasattr(data, 'getlist'):
            for key in data:
                files = data.getlist(key)
                if files and hasattr(files[0], 'read'):
                    mutable[key] = files[0]
        # Parse JSON string fields
        for field in ('name', 'description'):
            if field in mutable and isinstance(mutable[field], str):
                try:
                    parsed = json.loads(mutable[field])
                    if isinstance(parsed, dict):
                        mutable[field] = parsed
                except (json.JSONDecodeError, TypeError):
                    pass
        return super().to_internal_value(mutable)


class TransportCategoryPublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TransportCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'image_url', 'color', 'requires_destination']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
