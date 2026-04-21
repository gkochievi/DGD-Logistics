from django.contrib import admin
from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('name', 'plate_number', 'status', 'is_active')
    list_filter = ('categories', 'status', 'is_active')
    search_fields = ('name', 'plate_number', 'description')
    filter_horizontal = ('categories',)
