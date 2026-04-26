from django.contrib import admin
from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'requires_destination', 'is_active', 'created_at')
    list_filter = ('is_active', 'requires_destination')
    search_fields = ('name', 'description')
    filter_horizontal = ('car_categories',)
    prepopulated_fields = {'slug': ('name',)}
