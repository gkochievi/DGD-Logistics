from django.contrib import admin

from .models import SiteSettings, RestrictedTimeWindow


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'color_theme', 'updated_at')


@admin.register(RestrictedTimeWindow)
class RestrictedTimeWindowAdmin(admin.ModelAdmin):
    list_display = ('location_keyword', 'start_time', 'end_time', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('location_keyword',)
