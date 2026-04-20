from django.contrib import admin
from .models import Driver


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'license_number', 'phone', 'status', 'is_active')
    list_filter = ('status', 'is_active')
    search_fields = ('first_name', 'last_name', 'phone', 'email', 'license_number')
    filter_horizontal = ('vehicles',)
