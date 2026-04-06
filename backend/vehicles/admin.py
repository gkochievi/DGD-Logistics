from django.contrib import admin
from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'plate_number', 'status', 'is_active')
    list_filter = ('category', 'status', 'is_active')
    search_fields = ('name', 'plate_number', 'description')
