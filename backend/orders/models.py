from django.db import models
from django.conf import settings


class Order(models.Model):
    STATUS_NEW = 'new'
    STATUS_UNDER_REVIEW = 'under_review'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_UNDER_REVIEW, 'Under Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    URGENCY_LOW = 'low'
    URGENCY_NORMAL = 'normal'
    URGENCY_HIGH = 'high'
    URGENCY_URGENT = 'urgent'

    URGENCY_CHOICES = [
        (URGENCY_LOW, 'Low'),
        (URGENCY_NORMAL, 'Normal'),
        (URGENCY_HIGH, 'High'),
        (URGENCY_URGENT, 'Urgent'),
    ]

    CANCELLABLE_STATUSES = [STATUS_NEW, STATUS_UNDER_REVIEW]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    suggested_category = models.ForeignKey(
        'categories.TransportCategory', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='suggested_orders',
    )
    selected_category = models.ForeignKey(
        'categories.TransportCategory', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='selected_orders',
    )
    final_category = models.ForeignKey(
        'categories.TransportCategory', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='final_orders',
    )

    assigned_vehicle = models.ForeignKey(
        'vehicles.Vehicle', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders',
    )

    pickup_location = models.CharField(max_length=500)
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    destination_location = models.CharField(max_length=500, blank=True)
    destination_lat = models.FloatField(null=True, blank=True)
    destination_lng = models.FloatField(null=True, blank=True)
    requested_date = models.DateField()
    requested_time = models.TimeField(null=True, blank=True)
    contact_name = models.CharField(max_length=200)
    contact_phone = models.CharField(max_length=20)
    description = models.TextField()
    cargo_details = models.TextField(blank=True)
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default=URGENCY_NORMAL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    admin_comment = models.TextField(blank=True)
    user_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} - {self.get_status_display()}'

    @property
    def is_cancellable(self):
        return self.status in self.CANCELLABLE_STATUSES


class OrderImage(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='order_images/%Y/%m/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Image for Order #{self.order_id}'


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Order status histories'

    def __str__(self):
        return f'Order #{self.order_id}: {self.old_status} → {self.new_status}'
