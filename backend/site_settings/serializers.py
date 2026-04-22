import json

from rest_framework import serializers

from .models import SiteSettings, RestrictedTimeWindow


class RestrictedTimeWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestrictedTimeWindow
        fields = [
            'id', 'location_keyword', 'start_time', 'end_time',
            'description', 'is_active',
        ]


class SiteSettingsSerializer(serializers.ModelSerializer):
    site_logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()
    restricted_time_windows = RestrictedTimeWindowSerializer(
        many=True, read_only=True, source='_restricted_time_windows',
    )

    class Meta:
        model = SiteSettings
        fields = [
            'site_name', 'color_theme',
            'site_logo', 'site_logo_url',
            'favicon', 'favicon_url',
            'default_search_scope', 'default_search_countries',
            'restricted_time_windows',
            'updated_at',
        ]

    def _absolute_url(self, image_field):
        if not image_field:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url

    def get_site_logo_url(self, obj):
        return self._absolute_url(obj.site_logo)

    def get_favicon_url(self, obj):
        return self._absolute_url(obj.favicon)

    def to_internal_value(self, data):
        # default_search_countries arrives as a JSON string under
        # multipart/form-data — parse it before validation.
        mutable = {}
        for key in data:
            mutable[key] = data[key]
        if hasattr(data, 'getlist'):
            for key in data:
                files = data.getlist(key)
                if files and hasattr(files[0], 'read'):
                    mutable[key] = files[0]
        if isinstance(mutable.get('default_search_countries'), str):
            try:
                mutable['default_search_countries'] = json.loads(
                    mutable['default_search_countries']
                )
            except (json.JSONDecodeError, TypeError):
                pass
        return super().to_internal_value(mutable)
