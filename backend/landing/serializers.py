import json
from rest_framework import serializers
from .models import LandingPageSettings


class LandingPageSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    site_icon_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = LandingPageSettings
        fields = [
            'site_name',
            'color_theme',
            'site_icon', 'site_icon_url',
            'favicon', 'favicon_url',
            'hero_title', 'hero_description',
            'hero_image', 'hero_image_url',
            'stats',
            'steps_title', 'steps',
            'benefits_title', 'benefits',
            'search_scope', 'search_countries',
            'cta_title', 'cta_description', 'cta_button_text',
            'updated_at',
        ]

    def _get_image_url(self, image_field):
        if image_field:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image_field.url)
            return image_field.url
        return None

    def get_hero_image_url(self, obj):
        return self._get_image_url(obj.hero_image)

    def get_site_icon_url(self, obj):
        return self._get_image_url(obj.site_icon)

    def get_favicon_url(self, obj):
        return self._get_image_url(obj.favicon)

    def to_internal_value(self, data):
        # When receiving multipart/form-data, JSON fields arrive as strings.
        # Convert QueryDict to a plain dict so parsed JSON values stick.
        json_fields = [
            'hero_title', 'hero_description', 'stats',
            'steps_title', 'steps', 'benefits_title', 'benefits',
            'search_countries',
            'cta_title', 'cta_description', 'cta_button_text',
        ]
        mutable = {}
        for key in data:
            mutable[key] = data[key]
        # Preserve file fields from the original request
        if hasattr(data, 'getlist'):
            for key in data:
                files = data.getlist(key)
                if files and hasattr(files[0], 'read'):
                    mutable[key] = files[0]
        for field in json_fields:
            if field in mutable and isinstance(mutable[field], str):
                try:
                    mutable[field] = json.loads(mutable[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        return super().to_internal_value(mutable)
