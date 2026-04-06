from rest_framework import serializers
from .models import TransportCategory


class TransportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'color',
            'requires_destination', 'is_active', 'suggestion_keywords',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class TransportCategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'requires_destination']
