from django.contrib import admin
from .models import Order, OrderImage, OrderStatusHistory


class OrderImageInline(admin.TabularInline):
    model = OrderImage
    extra = 0


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('old_status', 'new_status', 'changed_by', 'comment', 'created_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'urgency', 'selected_service', 'created_at')
    list_filter = ('status', 'urgency', 'selected_service')
    search_fields = ('contact_name', 'contact_phone', 'description')
    inlines = [OrderImageInline, OrderStatusHistoryInline]
