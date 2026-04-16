import json
from rest_framework import serializers
from .models import LandingPageSettings


class LandingPageSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()

    class Meta:
        model = LandingPageSettings
        fields = [
            'hero_badge', 'hero_title', 'hero_description',
            'hero_image', 'hero_image_url',
            'stats',
            'steps_title', 'steps',
            'benefits_title', 'benefits',
            'cta_title', 'cta_description', 'cta_button_text',
            'updated_at',
        ]

    def get_hero_image_url(self, obj):
        if obj.hero_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.hero_image.url)
            return obj.hero_image.url
        return None

    def to_internal_value(self, data):
        # When receiving multipart/form-data, JSON fields arrive as strings
        json_fields = [
            'hero_title', 'hero_description', 'stats',
            'steps_title', 'steps', 'benefits_title', 'benefits',
            'cta_title', 'cta_description', 'cta_button_text',
        ]
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in json_fields:
            if field in mutable and isinstance(mutable[field], str):
                try:
                    mutable[field] = json.loads(mutable[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        return super().to_internal_value(mutable)
