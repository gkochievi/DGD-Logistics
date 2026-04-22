from django.db import models
from django.conf import settings

from config.media_utils import order_image_path


class Order(models.Model):
    STATUS_NEW = 'new'
    STATUS_UNDER_REVIEW = 'under_review'
    STATUS_OFFER_SENT = 'offer_sent'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_UNDER_REVIEW, 'Under Review'),
        (STATUS_OFFER_SENT, 'Offer Sent'),
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

    # Customer can cancel up through the offer stage; `approved` means the
    # customer has accepted and the job is locked in.
    CANCELLABLE_STATUSES = [STATUS_NEW, STATUS_UNDER_REVIEW, STATUS_OFFER_SENT]
    # Statuses that occupy a vehicle/driver's schedule — an outstanding offer
    # holds the resource so admins can't double-book while the customer decides.
    ACTIVE_STATUSES = [STATUS_OFFER_SENT, STATUS_APPROVED, STATUS_IN_PROGRESS]
    # Statuses that free the vehicle/driver (resource released).
    RELEASED_STATUSES = [STATUS_COMPLETED, STATUS_REJECTED, STATUS_CANCELLED]
    # Forward-only lifecycle order. Admins cannot move an order backwards
    # along this list — e.g. once the customer has accepted (approved), the
    # order cannot be rewound to under_review or offer_sent. Rejected and
    # cancelled are terminal exits and intentionally omitted.
    STATUS_PROGRESSION = [
        STATUS_NEW,
        STATUS_UNDER_REVIEW,
        STATUS_OFFER_SENT,
        STATUS_APPROVED,
        STATUS_IN_PROGRESS,
        STATUS_COMPLETED,
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    # Customer-facing "what is being requested" — customers pick a Service.
    suggested_service = models.ForeignKey(
        'services.Service', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='suggested_orders',
    )
    selected_service = models.ForeignKey(
        'services.Service', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='selected_orders',
    )
    final_service = models.ForeignKey(
        'services.Service', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='final_orders',
    )
    # Legacy car-category FKs — kept for pre-service orders; new orders use
    # the *_service fields above. Stays nullable; no UI writes to these now.
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
    assigned_driver = models.ForeignKey(
        'drivers.Driver', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders',
    )
    scheduled_from = models.DateTimeField(null=True, blank=True)
    scheduled_to = models.DateTimeField(null=True, blank=True)

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
    price = models.PositiveIntegerField(null=True, blank=True)
    customer_accepted_at = models.DateTimeField(null=True, blank=True)
    user_note = models.TextField(blank=True)
    route_stops = models.TextField(blank=True, default='')

    is_read_by_admin = models.BooleanField(default=False)
    is_read_by_customer = models.BooleanField(default=True)
    last_event_at = models.DateTimeField(auto_now_add=True)
    last_event_type = models.CharField(max_length=32, blank=True, default='created')

    # Set when an admin edits any customer-provided field (locations, dates,
    # contacts, description, etc.). Drives the "Edited by admin" badge shown
    # to the customer; detailed deltas live in OrderEditHistory.
    admin_edited_at = models.DateTimeField(null=True, blank=True)
    admin_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.pk} - {self.get_status_display()}'

    @property
    def is_cancellable(self):
        return self.status in self.CANCELLABLE_STATUSES

    @property
    def can_customer_accept(self):
        return (
            self.status == self.STATUS_OFFER_SENT
            and self.price is not None
            and self.price > 0
            and self.customer_accepted_at is None
        )


class OrderImage(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=order_image_path)
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


class OrderEditHistory(models.Model):
    """Per-field audit log for admin edits to customer-provided fields."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='edit_history')
    field_name = models.CharField(max_length=64)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+',
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = 'Order edit histories'

    def __str__(self):
        return f'Order #{self.order_id}: {self.field_name} edited'
